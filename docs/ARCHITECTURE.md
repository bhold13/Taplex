# TapLex architecture

## Source of truth

The live application is `sites-live/`.

The former root `frontend/` and `backend/` trees were prototype implementations and are not part of the active production stack.

## Runtime

TapLex runs as a Vinext/Next application on a Cloudflare Worker.

Bindings:

- `DB`: Cloudflare D1
- `BUCKET`: Cloudflare R2

D1 is the application database. Runtime schema initialization is in `sites-live/lib/database.ts`. Drizzle models used for schema tooling are in `sites-live/db/schema.ts`.

## Existing NFC domain

TapLex already has:

- `nfc_batches`
- `nfc_units`
- `nfc_tap_events`
- `nfc_transfers`
- `nfc_audit_logs`

Existing `/t/{secret}` links use a random secret whose hash is stored in `nfc_units.slug_hash`.

NTAG 424 DNA does not replace this domain. Secure metadata is one-to-one with a unit through `nfc_secure_tags.unit_id`.

## NTAG 424 DNA extension

`nfc_secure_tags` stores non-secret metadata:

- unit ID
- public secure ID
- chip type
- physical UID
- security mode
- key mode/reference state
- destination path
- highest observed SDM read counter
- verified/replay/invalid counts
- last verification time

AES key values are never stored in D1 plaintext.

## Firebase

The live app still contains Firebase configuration for push/FCM support. This does not make Firebase the TapLex application database. Do not remove Firebase dependencies until the notification implementation is migrated or removed.
