from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


REQUIRED_FRONTEND_ROUTES = [
    "app/page.js",
    "app/about/page.js",
    "app/features/page.js",
    "app/pricing/page.js",
    "app/contact/page.js",
    "app/login/page.js",
    "app/register/page.js",
    "app/forgot-password/page.js",
    "app/dashboard/page.js",
    "app/profile-builder/page.js",
    "app/edit-profile/page.js",
    "app/profile-settings/page.js",
    "app/notifications/page.js",
    "app/messages/page.js",
    "app/community-feed/page.js",
    "app/nearby/page.js",
    "app/marketplace/page.js",
    "app/events/page.js",
    "app/connections/page.js",
    "app/business-dashboard/page.js",
    "app/analytics/page.js",
    "app/billing/page.js",
    "app/subscription/page.js",
    "app/admin-dashboard/page.js",
    "app/support/page.js",
    "app/profile/[username]/page.js",
    "app/claim/[tagId]/page.js",
    "app/not-found.js",
    "app/terms/page.js",
    "app/privacy/page.js",
]

REQUIRED_BACKEND_ROUTES = [
    "health.py",
    "auth.py",
    "profiles.py",
    "connections.py",
    "messages.py",
    "marketplace.py",
    "events.py",
    "recommendations.py",
    "search.py",
    "nfc.py",
    "analytics.py",
    "billing.py",
    "admin.py",
]


def assert_exists(paths: list[Path]) -> None:
    missing = [str(path.relative_to(ROOT)) for path in paths if not path.exists()]
    if missing:
        raise SystemExit("Missing required files:\n" + "\n".join(missing))


def main() -> None:
    assert_exists([ROOT / "frontend" / route for route in REQUIRED_FRONTEND_ROUTES])
    assert_exists([ROOT / "backend" / "app" / "api" / "routes" / route for route in REQUIRED_BACKEND_ROUTES])
    schema = ROOT / "database" / "firestore.indexes.json"
    json.loads(schema.read_text(encoding="utf-8"))
    print("TapLex local smoke check passed.")


if __name__ == "__main__":
    main()
