"""Tests for api.inngest.analysis — analysis Inngest functions."""

from unittest.mock import MagicMock, patch


class TestOnAnalysisFailure:
    def test_marks_analysis_failed(self):
        from api.inngest.analysis import _on_analysis_failure

        ctx = MagicMock()
        ctx.event.data = {"analysis_id": "a-1"}

        mock_db = MagicMock()
        with patch("api.inngest.analysis.get_supabase_client", return_value=mock_db):
            _on_analysis_failure(ctx)
            mock_db.table.assert_called_with("analyses")

    def test_no_analysis_id_returns_early(self):
        from api.inngest.analysis import _on_analysis_failure

        ctx = MagicMock()
        ctx.event.data = {}

        with patch("api.inngest.analysis.get_supabase_client") as mock_get:
            _on_analysis_failure(ctx)
            mock_get.assert_not_called()

    def test_db_error_does_not_raise(self):
        from api.inngest.analysis import _on_analysis_failure

        ctx = MagicMock()
        ctx.event.data = {"analysis_id": "a-1"}

        with patch(
            "api.inngest.analysis.get_supabase_client",
            side_effect=Exception("DB down"),
        ):
            _on_analysis_failure(ctx)


class TestExtractHtmlMeta:
    def test_extracts_meta_tags(self):
        from api.inngest.report import _extract_html_meta

        html = """
        <html>
        <head>
        <meta name="consultant" content="Alice">
        <meta name="prospect" content="Bob">
        <meta name="overall_score" content="82">
        </head>
        </html>
        """
        meta = _extract_html_meta(html)
        assert meta["consultant"] == "Alice"
        assert meta["prospect"] == "Bob"
        assert meta["overall_score"] == 82

    def test_empty_html(self):
        from api.inngest.report import _extract_html_meta

        meta = _extract_html_meta("<html></html>")
        assert meta == {}

    def test_invalid_score_kept_as_string(self):
        from api.inngest.report import _extract_html_meta

        html = '<meta name="overall_score" content="N/A">'
        meta = _extract_html_meta(html)
        assert meta["overall_score"] == "N/A"
