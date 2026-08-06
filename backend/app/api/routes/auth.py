from fastapi import APIRouter, Depends

from app.core.security import Principal, get_current_user

router = APIRouter()


@router.get("/session")
def session(principal: Principal = Depends(get_current_user)):
    return {"uid": principal.uid, "email": principal.email, "roles": principal.roles}


@router.get("/recovery-checklist")
def recovery_checklist():
    return {
        "steps": [
            "Verify ownership through Firebase Authentication.",
            "Rotate active sessions after sensitive account recovery.",
            "Require a fresh login before changing email, password, or payout settings.",
        ]
    }
