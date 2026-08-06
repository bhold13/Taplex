from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.core.config import Settings, get_settings
from app.db.firebase import ensure_firebase_app


@dataclass(frozen=True)
class Principal:
    uid: str
    email: str | None
    roles: tuple[str, ...]

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token.strip()


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_taplex_dev_user: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Principal:
    """Validate Firebase ID tokens; local dev can use X-TapLex-Dev-User."""
    if settings.allow_dev_auth and x_taplex_dev_user:
        roles = ("admin", "user") if x_taplex_dev_user == "admin" else ("user",)
        return Principal(
            uid=x_taplex_dev_user,
            email=f"{x_taplex_dev_user}@dev.taplex.local",
            roles=roles,
        )

    token = _extract_bearer_token(authorization)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Firebase bearer token is required.",
        )

    try:
        ensure_firebase_app()
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:  # pragma: no cover - depends on Firebase runtime
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc

    roles = decoded.get("roles") or decoded.get("role") or ["user"]
    if isinstance(roles, str):
        roles = [roles]
    return Principal(uid=decoded["uid"], email=decoded.get("email"), roles=tuple(roles))


async def require_admin(principal: Principal = Depends(get_current_user)) -> Principal:
    if not principal.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required.",
        )
    return principal
