"""Tests for pure functions in api.services.transcriber_service."""

from api.services.transcriber_service import _build_transcript_markdown, _format_utterances


class TestFormatUtterances:
    def test_basic_formatting(self):
        utterances = [
            {"speaker": 0, "start": 0, "transcript": "Hello"},
            {"speaker": 1, "start": 65, "transcript": "Hi there"},
        ]
        body, count = _format_utterances(utterances)
        assert "[00:00] **Speaker 1:** Hello" in body
        assert "[01:05] **Speaker 2:** Hi there" in body
        assert count == 2

    def test_speaker_mapping(self):
        utterances = [
            {"speaker": 3, "start": 0, "transcript": "A"},
            {"speaker": 3, "start": 5, "transcript": "B"},
            {"speaker": 7, "start": 10, "transcript": "C"},
        ]
        body, count = _format_utterances(utterances)
        assert "Speaker 1" in body
        assert "Speaker 2" in body
        assert count == 2

    def test_empty_utterances(self):
        body, count = _format_utterances([])
        assert body == ""
        assert count == 0

    def test_timestamp_formatting(self):
        utterances = [{"speaker": 0, "start": 3661, "transcript": "Late"}]
        body, _ = _format_utterances(utterances)
        assert "[61:01]" in body


class TestBuildTranscriptMarkdown:
    def test_includes_frontmatter(self):
        md = _build_transcript_markdown("Body text", {"type": "recording", "duration": 10})
        assert md.startswith("---\n")
        assert "type: recording" in md
        assert "## Transcript" in md
        assert "Body text" in md
