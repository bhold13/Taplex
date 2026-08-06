from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import Principal, get_current_user
from app.models.schemas import Message, MessageCreate
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("", response_model=Message, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageCreate,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    if payload.recipient_uid == principal.uid:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")
    return repo.create(
        "messages",
        {
            "sender_uid": principal.uid,
            "recipient_uid": payload.recipient_uid,
            "body": payload.body,
            "inquiry_type": payload.inquiry_type,
            "report_status": "none",
        },
    )


@router.get("", response_model=list[Message])
def inbox(principal: Principal = Depends(get_current_user), repo: Repository = Depends(get_repository)):
    return repo.list("messages", filters={"recipient_uid": principal.uid}, limit=100)


@router.patch("/{message_id}/read", response_model=Message)
def mark_read(
    message_id: str,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    message = repo.get("messages", message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    if message["recipient_uid"] != principal.uid:
        raise HTTPException(status_code=403, detail="Only the recipient can mark this read.")
    return repo.update("messages", message_id, {"read_at": datetime.now(UTC)})
