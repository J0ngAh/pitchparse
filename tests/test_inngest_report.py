"""Tests for api.inngest.report — report Inngest functions."""

from unittest.mock import MagicMock, patch


class TestOnReportFailure:
    def test_marks_report_failed(self):
        from api.inngest.report import _on_report_failure

        ctx = MagicMock()
        ctx.event.data = {"report_id": "r-1"}

        mock_db = MagicMock()
        with patch("api.inngest.report.get_supabase_client", return_value=mock_db):
            _on_report_failure(ctx)
            mock_db.table.assert_called_with("reports")

    def test_no_report_id_returns_early(self):
        from api.inngest.report import _on_report_failure

        ctx = MagicMock()
        ctx.event.data = {}

        with patch("api.inngest.report.get_supabase_client") as mock_get:
            _on_report_failure(ctx)
            mock_get.assert_not_called()

    def test_db_error_does_not_raise(self):
        from api.inngest.report import _on_report_failure

        ctx = MagicMock()
        ctx.event.data = {"report_id": "r-1"}

        with patch(
            "api.inngest.report.get_supabase_client",
            side_effect=Exception("DB down"),
        ):
            _on_report_failure(ctx)
