"""Billing router — Stripe checkout, subscription management, webhooks."""

import structlog
from fastapi import APIRouter, HTTPException, Request
from stripe import SignatureVerificationError, StripeClient, Webhook

from api.auth import CurrentUser
from api.config import get_settings
from api.database import get_supabase_client
from api.models.schemas import (
    CheckoutRequest,
    CheckoutResponse,
    SubscriptionResponse,
)
from api.utils.supabase_helpers import row_as_dict, rows_as_dicts

logger = structlog.get_logger()

router = APIRouter()

PLAN_CONFIG = {
    "starter": {"quota": 50, "users": 1},
    "team": {"quota": 200, "users": 5},
}


def _get_stripe() -> StripeClient:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    return StripeClient(settings.stripe_secret_key)


def _get_price_id(plan: str) -> str:
    settings = get_settings()
    price_ids = {"starter": settings.stripe_starter_price_id, "team": settings.stripe_team_price_id}
    return price_ids[plan]


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(req: CheckoutRequest, user: CurrentUser):
    """Create a Stripe Checkout session for the chosen plan."""
    stripe = _get_stripe()
    db = get_supabase_client()

    # Get or create Stripe customer
    org_result = (
        db.table("organizations")
        .select("id, name, stripe_customer_id")
        .eq("id", user["org_id"])
        .single()
        .execute()
    )
    org = row_as_dict(org_result)

    if not org.get("stripe_customer_id"):
        customer = stripe.v1.customers.create(
            params={
                "email": user["email"],
                "name": org["name"],
                "metadata": {"org_id": org["id"]},
            }
        )
        db.table("organizations").update(
            {
                "stripe_customer_id": customer.id,
            }
        ).eq("id", org["id"]).execute()
        customer_id = customer.id
    else:
        customer_id = org["stripe_customer_id"]

    price_id = _get_price_id(req.plan)

    session = stripe.v1.checkout.sessions.create(
        params={
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": req.success_url,
            "cancel_url": req.cancel_url,
            "metadata": {"org_id": org["id"], "plan": req.plan},
        }
    )

    return CheckoutResponse(checkout_url=session.url or "")


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user: CurrentUser):
    """Get current subscription status for the user's org."""
    db = get_supabase_client()
    org_result = (
        db.table("organizations")
        .select("plan, analysis_quota, analysis_count, stripe_subscription_id")
        .eq("id", user["org_id"])
        .single()
        .execute()
    )
    org = row_as_dict(org_result)

    current_period_end = None
    status = "active"

    if org.get("stripe_subscription_id"):
        try:
            stripe = _get_stripe()
            sub = stripe.v1.subscriptions.retrieve(org["stripe_subscription_id"])
            status = sub.status
            current_period_end = getattr(sub, "current_period_end", None)
        except Exception:
            pass

    return SubscriptionResponse(
        plan=org["plan"],
        status=status,
        analysis_quota=org["analysis_quota"],
        analysis_count=org["analysis_count"],
        current_period_end=current_period_end,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for subscription lifecycle."""
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = Webhook.construct_event(
            payload.decode("utf-8"),
            sig_header,
            settings.stripe_webhook_secret,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    db = get_supabase_client()

    if event.type == "checkout.session.completed":
        session = event.data.object
        org_id = session.get("metadata", {}).get("org_id")
        plan = session.get("metadata", {}).get("plan", "starter")
        subscription_id = session.get("subscription")

        if org_id and subscription_id:
            quota = PLAN_CONFIG.get(plan, {}).get("quota", 50)
            db.table("organizations").update(
                {
                    "plan": plan,
                    "stripe_subscription_id": subscription_id,
                    "analysis_quota": quota,
                }
            ).eq("id", org_id).execute()

    elif event.type == "customer.subscription.updated":
        subscription = event.data.object
        _handle_subscription_update(db, subscription)

    elif event.type == "customer.subscription.deleted":
        subscription = event.data.object
        _handle_subscription_cancelled(db, subscription)

    elif event.type == "invoice.paid":
        _handle_invoice_paid(db, event.data.object)

    elif event.type == "invoice.payment_failed":
        invoice = event.data.object
        logger.warning("Payment failed for invoice %s", invoice.get("id"))

    return {"status": "ok"}


def _handle_subscription_update(db, subscription):
    """Update org when subscription changes (upgrade/downgrade)."""
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    org_result = (
        db.table("organizations").select("id").eq("stripe_customer_id", customer_id).execute()
    )
    if not org_result.data:
        return

    org_id = rows_as_dicts(org_result)[0]["id"]
    status = subscription.get("status")

    if status == "active":
        db.table("organizations").update(
            {
                "stripe_subscription_id": subscription.get("id"),
            }
        ).eq("id", org_id).execute()


def _handle_invoice_paid(db, invoice):
    """Reset analysis count at the start of each billing period."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    # Only reset on recurring invoices (not the first checkout)
    billing_reason = invoice.get("billing_reason")
    if billing_reason != "subscription_cycle":
        return

    org_result = (
        db.table("organizations")
        .select("id")
        .eq("stripe_subscription_id", subscription_id)
        .execute()
    )
    if not org_result.data:
        return

    org_id = rows_as_dicts(org_result)[0]["id"]
    db.table("organizations").update({"analysis_count": 0}).eq("id", org_id).execute()
    logger.info("Reset analysis count for org %s on subscription renewal", org_id)


def _handle_subscription_cancelled(db, subscription):
    """Downgrade org when subscription is cancelled."""
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    org_result = (
        db.table("organizations").select("id").eq("stripe_customer_id", customer_id).execute()
    )
    if not org_result.data:
        return

    org_id = rows_as_dicts(org_result)[0]["id"]
    db.table("organizations").update(
        {
            "plan": "starter",
            "stripe_subscription_id": None,
            "analysis_quota": 50,
        }
    ).eq("id", org_id).execute()
