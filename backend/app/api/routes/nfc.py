from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import Principal, get_current_user
from app.models.schemas import NFCTag, NFCTagClaim
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("/claim", response_model=NFCTag, status_code=status.HTTP_201_CREATED)
def claim_tag(
    payload: NFCTagClaim,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    if repo.find_one("nfc_tags", "tag_id", payload.tag_id):
        raise HTTPException(status_code=409, detail="NFC tag has already been claimed.")
    profile = repo.get("profiles", payload.profile_id)
    if not profile or profile["owner_uid"] != principal.uid:
        raise HTTPException(status_code=403, detail="You can only claim tags for your own profile.")
    return repo.create(
        "nfc_tags",
        {
            "tag_id": payload.tag_id,
            "profile_id": payload.profile_id,
            "chip_type": payload.chip_type,
            "owner_uid": principal.uid,
            "status": "claimed",
        },
    )


@router.patch("/{tag_id}/activate", response_model=NFCTag)
def activate_tag(
    tag_id: str,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    tag = repo.find_one("nfc_tags", "tag_id", tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="NFC tag not found.")
    if tag["owner_uid"] != principal.uid:
        raise HTTPException(status_code=403, detail="You do not own this NFC tag.")
    return repo.update("nfc_tags", tag["id"], {"status": "active"})


@router.patch("/{tag_id}/deactivate", response_model=NFCTag)
def deactivate_tag(
    tag_id: str,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    tag = repo.find_one("nfc_tags", "tag_id", tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="NFC tag not found.")
    if tag["owner_uid"] != principal.uid:
        raise HTTPException(status_code=403, detail="You do not own this NFC tag.")
    return repo.update("nfc_tags", tag["id"], {"status": "inactive"})
