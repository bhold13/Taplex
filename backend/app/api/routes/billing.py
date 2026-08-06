from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.core.security import Principal, get_current_user

router = APIRouter()


@router.post("/checkout/{plan}")
def create_checkout_session(
    plan: str,
    principal: Principal = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    price_lookup = {
        "monthly": settings.stripe_price_monthly,
        "annual": settings.stripe_price_annual,
        "lifetime": settings.stripe_price_lifetime,
    }
    if plan not in price_lookup:
        raise HTTPException(status_code=400, detail="Unsupported billing plan.")

    if not settings.stripe_secret_key:
        return {
            "mode": "development",
            "message": (
                "Stripe is not configured. Set STRIPE_SECRET_KEY and price ids "
                "to create live sessions."
            ),
            "plan": plan,
            "uid": principal.uid,
        }

    import stripe  # pragma: no cover - networked provider call

    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="payment" if plan == "lifetime" else "subscription",
        customer_email=principal.email,
        line_items=[{"price": price_lookup[plan], "quantity": 1}],
        success_url=f"{settings.public_frontend_url}/billing?status=success",
        cancel_url=f"{settings.public_frontend_url}/billing?status=cancelled",
        metadata={"uid": principal.uid, "plan": plan},
    )
    return {"checkout_url": session.url}
