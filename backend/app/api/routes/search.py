from fastapi import APIRouter, Depends

from app.models.schemas import SearchRequest, SearchResult
from app.services.repository import Repository, get_repository
from app.services.search import smart_search

router = APIRouter()


@router.post("", response_model=list[SearchResult])
def search(payload: SearchRequest, repo: Repository = Depends(get_repository)):
    profiles = repo.list("profiles", limit=500)
    if not payload.include_private:
        profiles = [
            profile
            for profile in profiles
            if profile.get("privacy", {}).get("profile_visibility", "public") == "public"
        ]
    return smart_search(payload.query, profiles)
