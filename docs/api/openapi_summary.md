# API Summary

The FastAPI service is mounted at `/api/v1`.

## Authentication

- `GET /auth/session`
- `GET /auth/recovery-checklist`

## Profiles

- `POST /profiles`
- `GET /profiles`
- `GET /profiles/{profile_id}`
- `GET /profiles/username/{username}`
- `PATCH /profiles/{profile_id}`

## Connections and Messaging

- `POST /connections`
- `GET /connections`
- `PATCH /connections/{connection_id}/accept`
- `POST /messages`
- `GET /messages`
- `PATCH /messages/{message_id}/read`

## Discovery

- `GET /recommendations/graph`
- `POST /recommendations/matches`
- `GET /recommendations/profiles/{profile_id}`
- `POST /search`

## NFC

- `POST /nfc/claim`
- `PATCH /nfc/{tag_id}/activate`
- `PATCH /nfc/{tag_id}/deactivate`

## Marketplace, Events, Billing, Analytics, Admin

- `POST /marketplace`
- `GET /marketplace`
- `POST /events`
- `GET /events`
- `POST /billing/checkout/{plan}`
- `GET /analytics/dashboard`
- `GET /admin/overview`
- `POST /admin/actions`
