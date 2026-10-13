# TapLex

TapLex is a premium NFC networking and physical-digital experience platform.

## Active application

The production application lives in `sites-live/`.

Current architecture:

- Next.js App Router + React 19
- Vinext / Vite
- Cloudflare Worker runtime
- Cloudflare D1 database
- Cloudflare R2 object storage
- Drizzle schema tooling
- Stripe commerce
- Firebase is retained only where the live app uses Firebase Cloud Messaging configuration; it is not the primary TapLex database.

The older root `frontend/` and `backend/` applications were prototype implementations and are being removed from the active branch so contributors do not accidentally build against obsolete Firebase/Firestore architecture.

## NFC architecture

TapLex already has one NFC inventory system:

- `nfc_batches`
- `nfc_units`
- `nfc_tap_events`
- `nfc_transfers`
- `nfc_audit_logs`

NTAG 424 DNA support extends that system through `nfc_secure_tags`. It does not create a second tag registry.

The standard resolver remains `/t/{secret}` for existing tags. NTAG 424 DNA secure taps use `/s/{publicId}?e=...&c=...` and are cryptographically verified before redirecting to their configured TapLex destination.

## Development

```bash
cd sites-live
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
npm test
```

See `docs/ARCHITECTURE.md` and `docs/NTAG424_SECURE.md`.
