from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "taplex-api"}


@router.get("/ready")
def readiness_check():
    return {"status": "ready"}
