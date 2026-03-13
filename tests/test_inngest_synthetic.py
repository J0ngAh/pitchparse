"""Tests for api.inngest.synthetic — synthetic generation Inngest functions."""

from unittest.mock import MagicMock, patch


class TestOnSyntheticFailure:
    def test_marks_transcript_failed(self):
        from api.inngest.synthetic import _on_synthetic_failure

        ctx = MagicMock()
        ctx.event.data = {"transcript_id": "t-1"}

        mock_db = MagicMock()
        with patch("api.inngest.synthetic.get_supabase_client", return_value=mock_db):
            _on_synthetic_failure(ctx)
            mock_db.table.assert_called_with("transcripts")

    def test_no_transcript_id_returns_early(self):
        from api.inngest.synthetic import _on_synthetic_failure

        ctx = MagicMock()
        ctx.event.data = {}

        with patch("api.inngest.synthetic.get_supabase_client") as mock_get:
            _on_synthetic_failure(ctx)
            mock_get.assert_not_called()

    def test_db_error_does_not_raise(self):
        from api.inngest.synthetic import _on_synthetic_failure

        ctx = MagicMock()
        ctx.event.data = {"transcript_id": "t-1"}

        with patch(
            "api.inngest.synthetic.get_supabase_client",
            side_effect=Exception("DB down"),
        ):
            _on_synthetic_failure(ctx)
