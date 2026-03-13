"""Inngest integration — client, functions, and exports."""

from api.inngest.analysis import run_analysis_fn
from api.inngest.client import inngest_client
from api.inngest.pipeline import full_pipeline_fn
from api.inngest.report import generate_report_fn
from api.inngest.synthetic import generate_synthetic_fn

all_functions = [
    run_analysis_fn,
    generate_report_fn,
    full_pipeline_fn,
    generate_synthetic_fn,
]

__all__ = [
    "inngest_client",
    "all_functions",
    "run_analysis_fn",
    "generate_report_fn",
    "full_pipeline_fn",
    "generate_synthetic_fn",
]
