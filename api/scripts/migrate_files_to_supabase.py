"""Migration script: import existing file-based data into Supabase.

Usage:
    python -m api.scripts.migrate_files_to_supabase [--data-dir /path/to/data] [--org-id UUID]

If --org-id is not provided, creates a default organization.
"""

import argparse
import re
import sys
from pathlib import Path

import frontmatter

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.database import get_supabase_client
from api.services.analysis_service import (
    extract_participants,
    extract_rating,
    extract_score,
)
from api.services.parser_service import (
    parse_coaching,
    parse_phases,
    parse_scorecard,
    parse_sentiment,
)


def _resolve_org(db, org_id: str | None) -> str | None:
    """Resolve or create an organization. Returns org_id or None on failure."""
    if org_id:
        org_result = db.table("organizations").select("id").eq("id", org_id).single().execute()
        if not org_result.data:
            print(f"Organization {org_id} not found")
            return None
        return org_id

    org_result = db.table("organizations").insert({"name": "PitchParse (Migrated)"}).execute()
    org_id = org_result.data[0]["id"]
    print(f"Created organization: {org_id}")
    return org_id


def _ensure_consultant(db, org_id: str, name: str, cache: dict[str, str]) -> str | None:
    """Get or create a consultant record. Returns consultant_id."""
    if not name:
        return None
    if name not in cache:
        existing = (
            db.table("consultants").select("id").eq("org_id", org_id).eq("name", name).execute()
        )
        if existing.data:
            cache[name] = existing.data[0]["id"]
        else:
            result = db.table("consultants").insert({"org_id": org_id, "name": name}).execute()
            cache[name] = result.data[0]["id"]
    return cache.get(name)


def _determine_source(path: Path, meta: dict) -> str:
    """Determine transcript source type from filename and metadata."""
    if meta.get("type") == "recording":
        return "recording"
    return "synthetic" if "synthetic" in path.name else "upload"


def _migrate_transcripts(
    db,
    data_path: Path,
    org_id: str,
    transcript_id_map: dict[str, str],
    consultant_id_map: dict[str, str],
) -> None:
    """Migrate transcript files into the transcripts table."""
    transcripts_dir = data_path / "transcripts"
    if not transcripts_dir.exists():
        return

    for path in sorted(transcripts_dir.glob("*.md")):
        try:
            post = frontmatter.load(str(path))
            meta = dict(post.metadata)
            consultant_name = meta.get("consultant", "")
            consultant_id = _ensure_consultant(db, org_id, consultant_name, consultant_id_map)
            source = _determine_source(path, meta)

            result = (
                db.table("transcripts")
                .insert(
                    {
                        "org_id": org_id,
                        "consultant_id": consultant_id,
                        "filename": path.name,
                        "source": source,
                        "metadata": meta,
                        "body": post.content,
                    }
                )
                .execute()
            )
            transcript_id_map[path.name] = result.data[0]["id"]
            print(f"  Migrated transcript: {path.name}")
        except Exception as e:
            print(f"  FAILED transcript {path.name}: {e}")


def _get_or_create_transcript(
    db,
    org_id: str,
    filename: str,
    fallback_stem: str,
    transcript_id_map: dict[str, str],
) -> str:
    """Look up transcript ID from map, creating a placeholder if missing."""
    existing = transcript_id_map.get(filename)
    if existing:
        return existing

    placeholder = (
        db.table("transcripts")
        .insert(
            {
                "org_id": org_id,
                "filename": filename or fallback_stem,
                "source": "upload",
                "metadata": {},
                "body": "",
            }
        )
        .execute()
    )
    tid: str = placeholder.data[0]["id"]
    if filename:
        transcript_id_map[filename] = tid
    return tid


def _build_analysis_row(meta: dict, body: str, org_id: str, transcript_id: str) -> dict:
    """Build the analysis insert dict from metadata and body text."""
    overall_score = meta.get("overall_score", extract_score(body))
    rating = meta.get("rating", extract_rating(body, overall_score))
    consultant_name = meta.get("consultant", "")
    prospect_name = meta.get("prospect", "")
    if not consultant_name or not prospect_name:
        c, p = extract_participants(body)
        consultant_name = consultant_name or c
        prospect_name = prospect_name or p

    return {
        "org_id": org_id,
        "transcript_id": transcript_id,
        "status": "complete",
        "overall_score": int(overall_score) if overall_score else 0,
        "rating": rating,
        "consultant_name": consultant_name,
        "prospect_name": prospect_name,
        "scorecard": parse_scorecard(body),
        "phases": parse_phases(body),
        "coaching": parse_coaching(body),
        "sentiment": parse_sentiment(body),
        "body": body,
        "model_used": "migrated",
    }


def _migrate_analyses(
    db,
    data_path: Path,
    org_id: str,
    transcript_id_map: dict[str, str],
    analysis_id_map: dict[str, str],
) -> None:
    """Migrate analysis files into the analyses table."""
    analyses_dir = data_path / "analyses"
    if not analyses_dir.exists():
        return

    for path in sorted(analyses_dir.glob("analysis-*.md")):
        try:
            post = frontmatter.load(str(path))
            meta = dict(post.metadata)
            body = post.content
            transcript_filename = meta.get("transcript", "")
            transcript_id = _get_or_create_transcript(
                db, org_id, transcript_filename, path.stem, transcript_id_map
            )
            row = _build_analysis_row(meta, body, org_id, transcript_id)
            result = db.table("analyses").insert(row).execute()
            analysis_id_map[path.name] = result.data[0]["id"]
            overall_score = row["overall_score"]
            print(f"  Migrated analysis: {path.name} (score: {overall_score})")
        except Exception as e:
            print(f"  FAILED analysis {path.name}: {e}")


def _find_matching_analysis(path: Path, meta: dict, analysis_id_map: dict[str, str]) -> str | None:
    """Find a matching analysis ID for a report file."""
    consultant = meta.get("consultant", "")
    if consultant:
        for aname, aid in analysis_id_map.items():
            if consultant.lower().replace(" ", "-") in aname.lower():
                return aid

    if analysis_id_map:
        return next(iter(analysis_id_map.values()))
    return None


def _migrate_reports(
    db,
    data_path: Path,
    org_id: str,
    analysis_id_map: dict[str, str],
) -> None:
    """Migrate report files into the reports table."""
    reports_dir = data_path / "reports"
    if not reports_dir.exists():
        return

    for path in sorted(reports_dir.iterdir()):
        if path.suffix not in (".html", ".md"):
            continue
        try:
            content = path.read_text()
            meta: dict = {}
            if path.suffix == ".html":
                for m in re.finditer(r'<meta\s+name="([^"]+)"\s+content="([^"]*)"', content):
                    meta[m.group(1)] = m.group(2)

            analysis_id = _find_matching_analysis(path, meta, analysis_id_map)
            if not analysis_id:
                print(f"  SKIPPED report {path.name}: no analysis to link")
                continue

            db.table("reports").insert(
                {
                    "org_id": org_id,
                    "analysis_id": analysis_id,
                    "body": content,
                    "metadata": meta,
                }
            ).execute()
            print(f"  Migrated report: {path.name}")
        except Exception as e:
            print(f"  FAILED report {path.name}: {e}")


def migrate(data_dir: str, org_id: str | None = None) -> None:
    """Run the full migration pipeline."""
    db = get_supabase_client()

    org_id = _resolve_org(db, org_id)
    if not org_id:
        return

    data_path = Path(data_dir)
    transcript_id_map: dict[str, str] = {}
    consultant_id_map: dict[str, str] = {}
    analysis_id_map: dict[str, str] = {}

    _migrate_transcripts(db, data_path, org_id, transcript_id_map, consultant_id_map)
    _migrate_analyses(db, data_path, org_id, transcript_id_map, analysis_id_map)
    _migrate_reports(db, data_path, org_id, analysis_id_map)

    print(f"\nMigration complete for org {org_id}")
    print(f"  Transcripts: {len(transcript_id_map)}")
    print(f"  Analyses: {len(analysis_id_map)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate file-based data to Supabase")
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).parent.parent.parent / "data"),
        help="Path to data directory",
    )
    parser.add_argument("--org-id", default=None, help="Existing org UUID to migrate into")
    args = parser.parse_args()
    migrate(args.data_dir, args.org_id)
