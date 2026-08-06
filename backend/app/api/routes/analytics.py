from fastapi import APIRouter, Depends

from app.core.security import Principal, get_current_user
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.get("/dashboard")
def analytics_dashboard(
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    profiles = repo.list("profiles", filters={"owner_uid": principal.uid}, limit=20)
    return {
        "profile_count": len(profiles),
        "connection_requests": len(
            repo.list("connections", filters={"requester_uid": principal.uid}, limit=200)
        ),
        "messages_received": len(repo.list("messages", filters={"recipient_uid": principal.uid}, limit=200)),
        "nfc_tags": len(repo.list("nfc_tags", filters={"owner_uid": principal.uid}, limit=100)),
        "recommendation_quality": "Ready for TapLex Connect scoring.",
    }
