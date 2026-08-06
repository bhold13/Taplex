from fastapi import APIRouter, Depends, status

from app.core.security import Principal, get_current_user
from app.models.schemas import MarketplaceListing, MarketplaceListingCreate
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("", response_model=MarketplaceListing, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: MarketplaceListingCreate,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    data = payload.model_dump(mode="json") | {
        "seller_uid": principal.uid,
        "is_active": True,
    }
    return repo.create("marketplace", data)


@router.get("", response_model=list[MarketplaceListing])
def list_listings(limit: int = 50, repo: Repository = Depends(get_repository)):
    return repo.list("marketplace", filters={"is_active": True}, limit=min(limit, 100))
