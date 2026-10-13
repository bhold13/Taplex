# TapLex Agent Instructions

## Source of truth

The active TapLex application is `sites-live/`.

Do not rebuild TapLex from the removed legacy Firebase frontend/backend applications.

## Production architecture

- UI/routes: `sites-live/app/`
- Components: `sites-live/components/`
- Server/domain logic: `sites-live/lib/`
- D1 runtime schema initialization: `sites-live/lib/database.ts`
- Drizzle models: `sites-live/db/schema.ts`
- Cloudflare Worker entry: `sites-live/worker/index.ts`
- Object storage: R2 binding `BUCKET`
- Database: D1 binding `DB`

## NFC rules

There is one NFC inventory system. Preserve existing `nfc_units`, claims, ownership, transfers, analytics, and permanent `/t/{secret}` resolver behavior.

NTAG 424 DNA security must extend existing units through `nfc_secure_tags`.

Secure resolver:

```text
/s/{publicId}?e=<encrypted PICCData>&c=<SDM MAC>
```

Never place AES keys in client code, public environment variables, D1 plaintext columns, URLs, QR codes, logs, or analytics payloads.

Development zero keys are permitted only for explicitly marked development tags and server-side test configuration.

## Safety

- Inspect current code before changing routes or schema.
- Preserve production data and IDs.
- Use additive schema changes.
- Do not reseed or replace production NFC data.
- Do not remove Firebase from `sites-live` while FCM/push notification code still uses it.
- Do not commit generated `.vinext` output or tar archives.
