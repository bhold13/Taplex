import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import get_settings


def firebase_configured() -> bool:
    settings = get_settings()
    return bool(settings.firebase_project_id or settings.firebase_credentials_path)


def ensure_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    settings = get_settings()
    options: dict[str, str] = {}
    if settings.firebase_project_id:
        options["projectId"] = settings.firebase_project_id
    if settings.firebase_storage_bucket:
        options["storageBucket"] = settings.firebase_storage_bucket

    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        return firebase_admin.initialize_app(cred, options)

    return firebase_admin.initialize_app(options=options or None)


def get_firestore_client():
    if not firebase_configured():
        return None
    ensure_firebase_app()
    return firestore.client()
