# TapLex live application

This directory is the production TapLex application.

## Stack

- Next.js App Router + React 19
- Vinext / Vite
- Cloudflare Worker
- Cloudflare D1 via binding `DB`
- Cloudflare R2 via binding `BUCKET`
- Drizzle ORM/schema tooling
- Stripe
- Firebase client package only for the push-notification/FCM feature where configured

## Important directories

- `app/` routes and API handlers
- `components/` UI
- `lib/` server/domain logic
- `db/schema.ts` Drizzle schema models
- `lib/database.ts` runtime D1 schema bootstrap
- `worker/index.ts` Cloudflare Worker entry and response security headers

## NFC

Existing NFC inventory and claim flows remain authoritative.

Standard tags:

```text
/t/{secret}
```

NTAG 424 DNA secure tags:

```text
/s/{publicId}?e=<encrypted PICCData>&c=<SDM MAC>
```

Secure tags are extensions of existing `nfc_units` through `nfc_secure_tags`. Do not create a parallel NFC registry.

Development verification keys are server-only runtime secrets:

```text
NTAG424_DEV_META_KEY
NTAG424_DEV_FILE_KEY
```

Factory-zero keys are for development tags only. Production key diversification/key wrapping is a later hardening stage.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm test
npm run db:generate
```

Generated `.vinext` output and tar archives are not source files and must not be committed.
