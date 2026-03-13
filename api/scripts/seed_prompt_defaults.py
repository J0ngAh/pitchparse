"""Seed global default prompt templates from api/prompts/ files.

Idempotent — skips slugs that already have a global default (org_id IS NULL).
Run: python -m api.scripts.seed_prompt_defaults
"""

from pathlib import Path

from api.database import get_supabase_client
from api.services.analysis_service import _read_command_body
from api.utils.supabase_helpers import rows_as_dicts

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"

SLUG_FILE_MAP = {
    "analyze": "analyze.md",
    "report": "report.md",
    "coach": "coach.md",
}


def seed_defaults() -> None:
    """Insert global default prompts from files, skipping existing."""
    db = get_supabase_client()

    existing = rows_as_dicts(
        db.table("prompt_templates").select("slug").is_("org_id", "null").execute()
    )
    existing_slugs = {row["slug"] for row in existing}

    for slug, filename in SLUG_FILE_MAP.items():
        if slug in existing_slugs:
            print(f"  skip {slug} (global default already exists)")
            continue

        filepath = PROMPT_DIR / filename
        if not filepath.exists():
            print(f"  skip {slug} (file not found: {filepath})")
            continue

        body = _read_command_body(str(filepath))
        db.table("prompt_templates").insert(
            {"org_id": None, "slug": slug, "version": 1, "body": body}
        ).execute()
        print(f"  seeded {slug} v1 ({len(body)} chars)")


if __name__ == "__main__":
    print("Seeding global prompt defaults...")
    seed_defaults()
    print("Done.")
