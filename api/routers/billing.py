"""Billing router — Stripe checkout, subscription management, webhooks."""

import structlog
from fastapi import APIRouter, HTTPException, Request
from stripe import Event, SignatureVerificationError, StripeClient, Webhook

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
    "free": {"quota": 5, "users": 1},
    "starter": {"quota": 50, "users": 5},
    "team": {"quota": 200, "users": 25},
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


def _get_or_create_customer(stripe: StripeClient, db, org: dict, email: str) -> str:
    """Get existing Stripe customer ID or create a new one."""
    if org.get("stripe_customer_id"):
        return org["stripe_customer_id"]
    customer = stripe.v1.customers.create(
        params={"email": email, "name": org["name"], "metadata": {"org_id": org["id"]}}
    )
    db.table("organizations").update({"stripe_customer_id": customer.id}).eq(
        "id", org["id"]
    ).execute()
    return customer.id


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(req: CheckoutRequest, user: CurrentUser):
    """Create a Stripe Checkout session for the chosen plan."""
    stripe = _get_stripe()
    db = get_supabase_client()
    org_result = (
        db.table("organizations")
        .select("id, name, stripe_customer_id, stripe_subscription_id")
        .eq("id", user["org_id"])
        .single()
        .execute()
    )
    org = row_as_dict(org_result)
    customer_id = _get_or_create_customer(stripe, db, org, user["email"])
    is_first_subscription = not org.get("stripe_subscription_id")
    subscription_data = {"trial_period_days": 14} if is_first_subscription else {}

    session = stripe.v1.checkout.sessions.create(
        params={  # type: ignore[arg-type]
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": _get_price_id(req.plan), "quantity": 1}],
            "success_url": req.success_url,
            "cancel_url": req.cancel_url,
            "metadata": {"org_id": org["id"], "plan": req.plan},
            "subscription_data": subscription_data,
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
    trial_ends_at = None
    status = "active"

    if org.get("stripe_subscription_id"):
        try:
            stripe = _get_stripe()
            sub = stripe.v1.subscriptions.retrieve(org["stripe_subscription_id"])
            status = sub.status
            current_period_end = getattr(sub, "current_period_end", None)
            if sub.status == "trialing":
                trial_ends_at = getattr(sub, "trial_end", None)
        except Exception:
            pass

    return SubscriptionResponse(
        plan=org["plan"],
        status=status,
        analysis_quota=org["analysis_quota"],
        analysis_count=org["analysis_count"],
        current_period_end=current_period_end,
        trial_ends_at=trial_ends_at,
    )


def _verify_webhook(payload: bytes, sig_header: str) -> Event:
    """Verify Stripe webhook signature and construct event."""
    settings = get_settings()
    try:
        return Webhook.construct_event(
            payload.decode("utf-8"), sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")


def _handle_checkout_completed(db, session) -> None:
    """Activate subscription after successful checkout."""
    org_id = session.get("metadata", {}).get("org_id")
    plan = session.get("metadata", {}).get("plan", "starter")
    subscription_id = session.get("subscription")
    if org_id and subscription_id:
        quota = PLAN_CONFIG.get(plan, {}).get("quota", 50)
        db.table("organizations").update(
            {"plan": plan, "stripe_subscription_id": subscription_id, "analysis_quota": quota}
        ).eq("id", org_id).execute()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for subscription lifecycle."""
    payload = await request.body()
    event = _verify_webhook(payload, request.headers.get("Stripe-Signature", ""))
    db = get_supabase_client()

    handlers = {
        "checkout.session.completed": lambda: _handle_checkout_completed(db, event.data.object),
        "customer.subscription.updated": lambda: _handle_subscription_update(db, event.data.object),
        "customer.subscription.deleted": lambda: _handle_subscription_cancelled(
            db, event.data.object
        ),
        "invoice.paid": lambda: _handle_invoice_paid(db, event.data.object),
        "invoice.payment_failed": lambda: logger.warning(
            "Payment failed for invoice %s", event.data.object.get("id")
        ),
    }
    handler = handlers.get(event.type)
    if handler:
        handler()

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

    if status in ("active", "trialing"):
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
            "plan": "free",
            "stripe_subscription_id": None,
            "analysis_quota": 5,
        }
    ).eq("id", org_id).execute()
