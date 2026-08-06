from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import Principal, get_current_user
from app.models.schemas import Connection, ConnectionRequest
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("", response_model=Connection, status_code=status.HTTP_201_CREATED)
def request_connection(
    payload: ConnectionRequest,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    if not repo.get("profiles", payload.target_profile_id):
        raise HTTPException(status_code=404, detail="Target profile not found.")
    return repo.create(
        "connections",
        {
            "requester_uid": principal.uid,
            "target_profile_id": payload.target_profile_id,
            "message": payload.message,
            "status": "pending",
        },
    )


@router.get("", response_model=list[Connection])
def list_connections(
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    return repo.list("connections", filters={"requester_uid": principal.uid}, limit=100)


@router.patch("/{connection_id}/accept", response_model=Connection)
def accept_connection(
    connection_id: str,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    connection = repo.get("connections", connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection request not found.")
    profile = repo.get("profiles", connection["target_profile_id"])
    if not profile or profile["owner_uid"] != principal.uid:
        raise HTTPException(status_code=403, detail="Only the target profile owner can accept.")
    return repo.update("connections", connection_id, {"status": "accepted"})
