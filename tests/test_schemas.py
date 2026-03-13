"""Tests for api.models.schemas Pydantic models."""

import pytest
from pydantic import ValidationError

from api.models.schemas import (
    AnalysisRunRequest,
    CheckoutRequest,
    LoginRequest,
    SignupRequest,
    TranscriptUpload,
)


class TestSignupRequest:
    def test_valid(self):
        req = SignupRequest(email="a@b.com", password="12345678", name="Test", org_name="Org")
        assert req.email == "a@b.com"

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError):
            SignupRequest(email="a@b.com", password="short", name="T", org_name="O")

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            SignupRequest(email="not-email", password="12345678", name="T", org_name="O")

    def test_missing_fields(self):
        with pytest.raises(ValidationError):
            SignupRequest(email="a@b.com", password="12345678")  # type: ignore[call-arg]


class TestLoginRequest:
    def test_valid(self):
        req = LoginRequest(email="a@b.com", password="12345678")
        assert req.email == "a@b.com"

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="a@b.com", password="short")


class TestTranscriptUpload:
    def test_defaults(self):
        req = TranscriptUpload(filename="test.md", body="content")
        assert req.source == "upload"
        assert req.metadata == {}
        assert req.consultant_name is None


class TestAnalysisRunRequest:
    def test_defaults(self):
        req = AnalysisRunRequest(transcript_id="abc")
        assert req.model == "claude-sonnet-4-6"
        assert req.focus is None


class TestCheckoutRequest:
    def test_starter_valid(self):
        req = CheckoutRequest(plan="starter", success_url="http://ok", cancel_url="http://no")
        assert req.plan == "starter"

    def test_team_valid(self):
        req = CheckoutRequest(plan="team", success_url="http://ok", cancel_url="http://no")
        assert req.plan == "team"

    def test_invalid_plan_rejected(self):
        with pytest.raises(ValidationError):
            CheckoutRequest(plan="enterprise", success_url="http://ok", cancel_url="http://no")
