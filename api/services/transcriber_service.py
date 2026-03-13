"""Transcription service — Deepgram audio transcription."""

from datetime import date


def _format_utterances(utterances: list[dict]) -> tuple[str, int]:
    """Format Deepgram utterances into markdown lines. Returns (body, speaker_count)."""
    lines: list[str] = []
    speaker_map: dict[int, str] = {}
    speaker_counter = 0

    for utt in utterances:
        speaker_id = utt.get("speaker", 0)
        if speaker_id not in speaker_map:
            speaker_counter += 1
            speaker_map[speaker_id] = f"Speaker {speaker_counter}"
        start_sec = utt.get("start", 0)
        mins = int(start_sec // 60)
        secs = int(start_sec % 60)
        text = utt.get("transcript", "").strip()
        lines.append(f"[{mins:02d}:{secs:02d}] **{speaker_map[speaker_id]}:** {text}")

    return "\n\n".join(lines), len(speaker_map)


def _build_transcript_markdown(body: str, metadata: dict) -> str:
    """Build a complete markdown transcript with YAML frontmatter."""
    frontmatter = "---\n"
    for k, v in metadata.items():
        frontmatter += f"{k}: {v}\n"
    frontmatter += "---\n\n"
    return frontmatter + "## Transcript\n\n" + body


def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    api_key: str,
) -> tuple[str, dict]:
    """Transcribe audio using Deepgram. Returns (markdown, metadata)."""
    from deepgram import DeepgramClient

    client = DeepgramClient(api_key=api_key)
    response = client.listen.v1.media.transcribe_file(
        request=file_bytes,
        model="nova-2",
        smart_format=True,
        diarize=True,
        punctuate=True,
        utterances=True,
    )
    result = response.dict()

    utterances = result.get("results", {}).get("utterances", [])
    duration = result.get("metadata", {}).get("duration", 0)
    body, num_speakers = _format_utterances(utterances)
    duration_minutes = round(duration / 60, 1) if duration else 0

    metadata = {
        "type": "recording",
        "generated_date": date.today().isoformat(),
        "duration_minutes": duration_minutes,
        "num_speakers": num_speakers,
    }

    markdown = _build_transcript_markdown(body, metadata)
    return markdown, metadata
