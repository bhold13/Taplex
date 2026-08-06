from fastapi import APIRouter, Depends, HTTPException

from app.core.security import Principal, require_admin
from app.models.schemas import AdminAction
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.get("/overview")
def admin_overview(
    _: Principal = Depends(require_admin),
    repo: Repository = Depends(get_repository),
):
    return {
        "users": "Managed by Firebase Authentication",
        "profiles": len(repo.list("profiles", limit=1000)),
        "nfc_tags": len(repo.list("nfc_tags", limit=1000)),
        "marketplace": len(repo.list("marketplace", limit=1000)),
        "events": len(repo.list("events", limit=1000)),
        "reports": len(repo.list("reports", limit=1000)),
    }


@router.post("/actions")
def admin_action(
    payload: AdminAction,
    principal: Principal = Depends(require_admin),
    repo: Repository = Depends(get_repository),
):
    collection_lookup = {
        "profile": "profiles",
        "business": "businesses",
        "nfc_tag": "nfc_tags",
        "listing": "marketplace",
        "event": "events",
        "report": "reports",
        "subscription": "subscriptions",
    }
    if payload.resource_type == "user":
        return {
            "accepted": True,
            "handled_by": "firebase-auth-admin",
            "action": payload.action,
            "actor_uid": principal.uid,
        }
    collection = collection_lookup.get(payload.resource_type)
    resource = repo.get(collection, payload.resource_id) if collection else None
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    audit = repo.create(
        "audit_logs",
        {
            "actor_uid": principal.uid,
            "resource_type": payload.resource_type,
            "resource_id": payload.resource_id,
            "action": payload.action,
            "note": payload.note,
        },
    )
    return {"accepted": True, "audit_log": audit}
