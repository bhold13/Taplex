from collections import defaultdict
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.db.firebase import get_firestore_client


class Repository:
    """Firestore gateway with an in-memory fallback for local development and tests."""

    def __init__(self):
        self._memory: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)

    def _db(self):
        return get_firestore_client()

    def create(self, collection: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = deepcopy(payload)
        item_id = data.get("id") or uuid4().hex
        timestamp = datetime.now(UTC)
        data.setdefault("id", item_id)
        data.setdefault("created_at", timestamp)
        data["updated_at"] = timestamp

        db = self._db()
        if db is not None:  # pragma: no cover - requires Firebase
            db.collection(collection).document(item_id).set(data)
            return data

        self._memory[collection][item_id] = data
        return deepcopy(data)

    def get(self, collection: str, item_id: str) -> dict[str, Any] | None:
        db = self._db()
        if db is not None:  # pragma: no cover - requires Firebase
            snapshot = db.collection(collection).document(item_id).get()
            if not snapshot.exists:
                return None
            return snapshot.to_dict()
        item = self._memory[collection].get(item_id)
        return deepcopy(item) if item else None

    def find_one(self, collection: str, field: str, value: Any) -> dict[str, Any] | None:
        matches = self.list(collection, filters={field: value}, limit=1)
        return matches[0] if matches else None

    def list(
        self,
        collection: str,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        db = self._db()
        if db is not None:  # pragma: no cover - requires Firebase
            query = db.collection(collection)
            for field, value in (filters or {}).items():
                query = query.where(field, "==", value)
            return [doc.to_dict() for doc in query.limit(limit).stream()]

        values = list(self._memory[collection].values())
        for field, expected in (filters or {}).items():
            values = [item for item in values if item.get(field) == expected]
        return deepcopy(values[:limit])

    def update(self, collection: str, item_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        current = self.get(collection, item_id)
        if current is None:
            return None
        patch = {key: value for key, value in payload.items() if value is not None}
        patch["updated_at"] = datetime.now(UTC)
        current.update(patch)

        db = self._db()
        if db is not None:  # pragma: no cover - requires Firebase
            db.collection(collection).document(item_id).update(patch)
            return current

        self._memory[collection][item_id] = current
        return deepcopy(current)

    def delete(self, collection: str, item_id: str) -> bool:
        db = self._db()
        if db is not None:  # pragma: no cover - requires Firebase
            db.collection(collection).document(item_id).delete()
            return True
        return self._memory[collection].pop(item_id, None) is not None


repository = Repository()


def get_repository() -> Repository:
    return repository
