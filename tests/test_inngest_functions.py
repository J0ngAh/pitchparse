"""Tests for Inngest function internals — step closures and logic."""

from unittest.mock import MagicMock, patch

import pytest


class TestAnalysisFnSteps:
    """Test the inner closures of run_analysis_fn by extracting and calling them."""

    def test_set_processing_updates_status(self):
        from api.inngest.analysis import run_analysis_fn

        ctx = MagicMock()
        ctx.event.data = {
            "analysis_id": "a-1",
            "org_id": "o-1",
            "transcript_id": "t-1",
            "model": "claude-sonnet-4-6",
        }
        # Capture the step.run calls to extract closures
        step_closures = {}

        def capture_run(name, fn):
            step_closures[name] = fn
            if name == "set_processing_and_fetch_transcript":
                mock_db = MagicMock()
                chain = mock_db.table.return_value.select.return_value
                chain.eq.return_value.eq.return_value.single.return_value.execute.return_value = (
                    MagicMock(data={"body": "transcript text"})
                )
                with patch("api.inngest.analysis.get_supabase_client", return_value=mock_db):
                    return fn()
            elif name == "call_claude":
                mock_result = MagicMock()
                mock_result.model_dump.return_value = {"overall_score": 82}
                with patch("api.inngest.analysis.get_settings") as mock_s:
                    mock_s.return_value.anthropic_api_key = "key"
                    with patch(
                        "api.inngest.analysis.run_analysis",
                        return_value=(mock_result, "tmpl-id"),
                    ):
                        return fn()
            elif name == "save_results_and_increment_quota":
                mock_db = MagicMock()
                with patch("api.inngest.analysis.get_supabase_client", return_value=mock_db):
                    with patch("api.inngest.analysis.AnalysisResult"):
                        with patch(
                            "api.inngest.analysis.render_analysis_markdown", return_value="md"
                        ):
                            fn()
                return None

        ctx.step.run = capture_run
        ctx.step.send_event = MagicMock()

        run_analysis_fn._handler(ctx)
        assert "set_processing_and_fetch_transcript" in step_closures
        assert "call_claude" in step_closures


class TestReportFnSteps:
    def test_fetch_analysis_step(self):
        from api.inngest.report import generate_report_fn

        ctx = MagicMock()
        ctx.event.data = {
            "report_id": "r-1",
            "analysis_id": "a-1",
            "org_id": "o-1",
            "model": "claude-sonnet-4-6",
        }

        step_closures = {}

        def capture_run(name, fn):
            step_closures[name] = fn
            if name == "fetch_analysis":
                mock_db = MagicMock()
                chain = mock_db.table.return_value.select.return_value
                chain.eq.return_value.eq.return_value.single.return_value.execute.return_value = (
                    MagicMock(
                        data={
                            "body": "analysis",
                            "consultant_name": "A",
                            "prospect_name": "B",
                            "overall_score": 82,
                            "rating": "Good",
                        }
                    )
                )
                with patch("api.inngest.report.get_supabase_client", return_value=mock_db):
                    return fn()
            elif name == "call_claude":
                mock_db2 = MagicMock()
                org_resp = MagicMock(data={"config": None})
                chain = mock_db2.table.return_value.select.return_value
                chain.eq.return_value.single.return_value.execute.return_value = org_resp
                with patch("api.inngest.report.get_supabase_client", return_value=mock_db2):
                    with patch("api.inngest.report.get_settings") as mock_s:
                        mock_s.return_value.anthropic_api_key = "key"
                        with patch(
                            "api.inngest.report.run_report_generation",
                            return_value="<html></html>",
                        ):
                            return fn()
            elif name == "save_report":
                mock_db = MagicMock()
                with patch("api.inngest.report.get_supabase_client", return_value=mock_db):
                    fn()
                return None

        ctx.step.run = capture_run

        result = generate_report_fn._handler(ctx)
        assert result["status"] == "complete"
        assert "fetch_analysis" in step_closures


class TestSyntheticFnSteps:
    def test_steps_run(self):
        from api.inngest.synthetic import generate_synthetic_fn

        ctx = MagicMock()
        ctx.event.data = {
            "transcript_id": "t-1",
            "quality": "good",
            "model": "claude-sonnet-4-6",
        }

        step_closures = {}

        def capture_run(name, fn):
            step_closures[name] = fn
            if name == "set_processing":
                mock_db = MagicMock()
                with patch("api.inngest.synthetic.get_supabase_client", return_value=mock_db):
                    fn()
                return None
            elif name == "call_claude":
                with patch("api.inngest.synthetic.get_settings") as mock_s:
                    mock_s.return_value.anthropic_api_key = "key"
                    with patch(
                        "api.inngest.synthetic.generate_synthetic",
                        return_value="---\nconsultant: Bob\n---\ntext",
                    ):
                        return fn()
            elif name == "save_transcript":
                mock_db = MagicMock()
                with patch("api.inngest.synthetic.get_supabase_client", return_value=mock_db):
                    fn()
                return None

        ctx.step.run = capture_run

        result = generate_synthetic_fn._handler(ctx)
        assert result["status"] == "complete"
        assert "set_processing" in step_closures
        assert "call_claude" in step_closures


class TestPipelineFnSteps:
    def test_orchestrates_analysis_and_report(self):
        from api.inngest.pipeline import full_pipeline_fn

        ctx = MagicMock()
        ctx.event.data = {
            "analysis_id": "a-1",
            "org_id": "o-1",
        }
        ctx.step.wait_for_event.return_value = MagicMock()  # analysis completed

        def capture_run(name, fn):
            if name == "create_report":
                mock_db = MagicMock()
                mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
                    data=[
                        {
                            "id": "r-1",
                            "org_id": "o-1",
                            "analysis_id": "a-1",
                            "body": "",
                            "metadata": {"status": "pending"},
                        }
                    ]
                )
                with patch("api.inngest.pipeline.get_supabase_client", return_value=mock_db):
                    return fn()

        ctx.step.run = capture_run

        result = full_pipeline_fn._handler(ctx)
        assert result["status"] == "complete"
        ctx.step.send_event.assert_called()

    def test_analysis_timeout_raises(self):
        from api.inngest.pipeline import full_pipeline_fn

        ctx = MagicMock()
        ctx.event.data = {
            "analysis_id": "a-1",
            "org_id": "o-1",
        }
        ctx.step.wait_for_event.return_value = None  # timeout

        with pytest.raises(Exception, match="timed out"):
            full_pipeline_fn._handler(ctx)
