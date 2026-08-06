from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import Principal, get_current_user
from app.models.schemas import Profile, ProfileCreate, ProfileUpdate
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.post("", response_model=Profile, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: ProfileCreate,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    if repo.find_one("profiles", "username", payload.username):
        raise HTTPException(status_code=409, detail="Username is already in use.")
    data = payload.model_dump(mode="json")
    data["owner_uid"] = principal.uid
    return repo.create("profiles", data)


@router.get("", response_model=list[Profile])
def list_profiles(limit: int = 50, repo: Repository = Depends(get_repository)):
    return repo.list("profiles", limit=min(limit, 100))


@router.get("/{profile_id}", response_model=Profile)
def get_profile(profile_id: str, repo: Repository = Depends(get_repository)):
    profile = repo.get("profiles", profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile


@router.get("/username/{username}", response_model=Profile)
def get_profile_by_username(username: str, repo: Repository = Depends(get_repository)):
    profile = repo.find_one("profiles", "username", username)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile


@router.patch("/{profile_id}", response_model=Profile)
def update_profile(
    profile_id: str,
    payload: ProfileUpdate,
    principal: Principal = Depends(get_current_user),
    repo: Repository = Depends(get_repository),
):
    profile = repo.get("profiles", profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    if profile["owner_uid"] != principal.uid and not principal.is_admin:
        raise HTTPException(status_code=403, detail="You cannot edit this profile.")
    updated = repo.update("profiles", profile_id, payload.model_dump(mode="json", exclude_unset=True))
    return updated
