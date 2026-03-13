"""Tests for api.routers.billing — Stripe checkout, subscription, webhook."""

from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_create_checkout_new_customer(app_client, mock_supabase, sample_org):
    mock_supabase._set_data(sample_org)

    mock_stripe = MagicMock()
    mock_customer = MagicMock()
    mock_customer.id = "cus_123"
    mock_stripe.v1.customers.create.return_value = mock_customer

    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/session"
    mock_stripe.v1.checkout.sessions.create.return_value = mock_session

    with patch("api.routers.billing._get_stripe", return_value=mock_stripe):
        with patch("api.routers.billing._get_price_id", return_value="price_123"):
            resp = await app_client.post(
                "/api/billing/checkout",
                json={
                    "plan": "starter",
                    "success_url": "http://ok",
                    "cancel_url": "http://no",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["checkout_url"] == "https://checkout.stripe.com/session"


@pytest.mark.asyncio
async def test_create_checkout_existing_customer(app_client, mock_supabase, sample_org):
    sample_org["stripe_customer_id"] = "cus_existing"
    mock_supabase._set_data(sample_org)

    mock_stripe = MagicMock()
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/session"
    mock_stripe.v1.checkout.sessions.create.return_value = mock_session

    with patch("api.routers.billing._get_stripe", return_value=mock_stripe):
        with patch("api.routers.billing._get_price_id", return_value="price_123"):
            resp = await app_client.post(
                "/api/billing/checkout",
                json={
                    "plan": "team",
                    "success_url": "http://ok",
                    "cancel_url": "http://no",
                },
            )
            assert resp.status_code == 200
            mock_stripe.v1.customers.create.assert_not_called()


@pytest.mark.asyncio
async def test_get_subscription(app_client, mock_supabase, sample_org):
    mock_supabase._set_data(sample_org)
    resp = await app_client.get("/api/billing/subscription")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan"] == "starter"
    assert data["analysis_quota"] == 50


@pytest.mark.asyncio
async def test_webhook_checkout_completed(app_client, mock_supabase):
    mock_supabase._set_data([{"id": "test-oid"}])

    event = MagicMock()
    event.type = "checkout.session.completed"
    # Make data.object behave like a dict
    event.data.object = {
        "metadata": {"org_id": "test-oid", "plan": "team"},
        "subscription": "sub_123",
    }

    with patch("api.routers.billing.Webhook.construct_event", return_value=event):
        resp = await app_client.post(
            "/api/billing/webhook",
            content=b"payload",
            headers={"Stripe-Signature": "sig"},
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_webhook_subscription_deleted(app_client, mock_supabase):
    mock_supabase._set_data([{"id": "test-oid"}])

    event = MagicMock()
    event.type = "customer.subscription.deleted"
    event.data.object = {"customer": "cus_123"}

    with patch("api.routers.billing.Webhook.construct_event", return_value=event):
        resp = await app_client.post(
            "/api/billing/webhook",
            content=b"payload",
            headers={"Stripe-Signature": "sig"},
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_webhook_invalid_signature(app_client, mock_supabase):
    from stripe import SignatureVerificationError

    with patch(
        "api.routers.billing.Webhook.construct_event",
        side_effect=SignatureVerificationError("bad", "sig"),
    ):
        resp = await app_client.post(
            "/api/billing/webhook",
            content=b"payload",
            headers={"Stripe-Signature": "bad"},
        )
        assert resp.status_code == 400
