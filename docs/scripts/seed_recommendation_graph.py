from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.services.recommendations import COMPLEMENTARY_GRAPH  # noqa: E402


def main() -> None:
    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    credential_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")

    if not project_id and not credential_path:
        output = ROOT / "database" / "recommendation_graph.seed.json"
        output.write_text(json.dumps(COMPLEMENTARY_GRAPH, indent=2), encoding="utf-8")
        print(f"Wrote {output}")
        return

    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        if credential_path:
            firebase_admin.initialize_app(
                credentials.Certificate(credential_path),
                {"projectId": project_id},
            )
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})

    db = firestore.client()
    batch = db.batch()
    for profession, complements in COMPLEMENTARY_GRAPH.items():
        ref = db.collection("recommendation_graph").document(profession.replace("/", "-"))
        batch.set(
            ref,
            {
                "profession": profession,
                "complementary_professions": complements,
                "confidence": 0.85,
                "created_by": "seed_recommendation_graph.py",
            },
        )
    batch.commit()
    print(f"Seeded {len(COMPLEMENTARY_GRAPH)} recommendation graph nodes.")


if __name__ == "__main__":
    main()
