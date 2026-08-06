from fastapi import APIRouter, Depends, status

from app.core.security import Principal, get_current_user
from app.models.schemas import Event, EventCreate
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    data = payload.model_dump(mode="json") | {"host_uid": principal.uid}
    return repo.create("events", data)


@router.get("", response_model=list[Event])
def list_events(limit: int = 50, repo: Repository = Depends(get_repository)):
    return repo.list("events", limit=min(limit, 100))
