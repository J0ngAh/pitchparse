"""Tests for api.services.synthetic_service pure functions."""

from unittest.mock import MagicMock, patch

from api.services.synthetic_service import (
    QUALITY_LEVELS,
    SCORE_RANGES,
    build_synthetic_system_prompt,
    generate_synthetic,
)


class TestBuildSyntheticSystemPrompt:
    def test_returns_non_empty(self):
        prompt = build_synthetic_system_prompt()
        assert len(prompt) > 50

    def test_includes_references(self):
        prompt = build_synthetic_system_prompt()
        # Should include at least one reference file content
        assert "Reference:" in prompt or len(prompt) > 100


class TestGenerateSynthetic:
    def test_fixed_quality(self):
        mock_block = MagicMock()
        mock_block.text = "---\nconsultant: Alice\n---\nTranscript content"

        import anthropic

        mock_block.__class__ = anthropic.types.TextBlock

        mock_message = MagicMock()
        mock_message.content = [mock_block]

        with patch("api.services.synthetic_service.anthropic.Anthropic") as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_message
            result = generate_synthetic(api_key="test-key", quality="good")
            assert "Alice" in result

    def test_random_quality(self):
        mock_block = MagicMock()
        mock_block.text = "Generated transcript"

        import anthropic

        mock_block.__class__ = anthropic.types.TextBlock

        mock_message = MagicMock()
        mock_message.content = [mock_block]

        with patch("api.services.synthetic_service.anthropic.Anthropic") as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_message
            with patch("api.services.synthetic_service.random.choice", return_value="poor"):
                result = generate_synthetic(api_key="test-key", quality="random")
                assert result == "Generated transcript"


class TestConstants:
    def test_quality_levels(self):
        assert len(QUALITY_LEVELS) == 4
        assert "excellent" in QUALITY_LEVELS

    def test_score_ranges(self):
        assert SCORE_RANGES["excellent"] == (90, 100)
        assert SCORE_RANGES["terrible"] == (0, 39)
