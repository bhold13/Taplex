from fastapi import APIRouter, Depends

from app.models.schemas import CompatibilityMatch, RecommendationRequest
from app.services.recommendations import COMPLEMENTARY_GRAPH, recommend_for_profile
from app.services.repository import Repository, get_repository

router = APIRouter()


@router.get("/graph")
def recommendation_graph():
    return {"graph": COMPLEMENTARY_GRAPH}


@router.post("/matches", response_model=list[CompatibilityMatch])
def recommend_matches(payload: RecommendationRequest):
    return recommend_for_profile(payload.profile, payload.candidates, payload.limit)


@router.get("/profiles/{profile_id}", response_model=list[CompatibilityMatch])
def recommend_for_existing_profile(
    profile_id: str,
    limit: int = 10,
    repo: Repository = Depends(get_repository),
):
    profile = repo.get("profiles", profile_id)
    if not profile:
        return []
    candidates = repo.list("profiles", limit=200)
    return recommend_for_profile(profile, candidates, limit)
