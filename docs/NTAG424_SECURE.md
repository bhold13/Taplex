# TapLex Secure: NTAG 424 DNA foundation

## Current development tag

The verified development flow uses NTAG 424 DNA Secure Dynamic Messaging with:

- encrypted PICCData in `e`
- truncated SDM MAC in `c`
- UID + SDM read counter inside encrypted PICCData
- `SDMMACInputOffset == SDMMACOffset`, therefore zero-length MAC input

Public secure resolver format:

```text
https://taplex.co/s/TLX000001?e=<32 hex>&c=<16 hex>
```

## Request flow

1. Read `publicId`, `e`, and `c`.
2. Load `nfc_secure_tags` and its existing `nfc_units` record.
3. Decrypt PICCData with the server-side SDM meta-read key.
4. Extract UID and 24-bit read counter.
5. Derive the SDM file-read session MAC key.
6. Calculate expected truncated MAC.
7. Constant-time compare expected MAC with `c`.
8. Confirm the decrypted UID matches the registered UID.
9. Classify the request as fresh or replay/stale from the counter.
10. Record secure analytics.
11. Redirect to the configured same-origin TapLex destination.

## Development-only keys

The initial implementation accepts these runtime secret names:

```text
NTAG424_DEV_META_KEY
NTAG424_DEV_FILE_KEY
```

Factory-zero keys may be used only on explicitly marked development tags. They are not production security.

## Production hardening still required

Before selling a tag as TapLex Secure:

- replace all factory keys
- store production keys using key wrapping or a dedicated secret/key-management design
- diversify keys per tag or defined secure batch
- rotate Key 0 last
- implement provisioning audit logs
- implement originality-signature verification where required
- add admin provisioning UI and production-state gates


## Validation gate

This branch must pass the repository TapLex Secure validation workflow (install, TypeScript, ESLint, production build, and rendered HTML tests) before merge.
