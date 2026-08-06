from fastapi import APIRouter

from app.api.routes import (
    admin,
    analytics,
    auth,
    billing,
    connections,
    events,
    health,
    marketplace,
    messages,
    nfc,
    profiles,
    recommendations,
    search,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(nfc.router, prefix="/nfc", tags=["nfc"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
