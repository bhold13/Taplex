# TapLex

TapLex is a premium black-and-gold NFC networking platform for creators, professionals, local services, and community builders. The MVP lets users create a profile, showcase talent and services, get discovered, share a public profile, and follow a clear subscription upgrade path.

## Project Structure

```text
TapLex/
  frontend/   Next.js App Router application
  backend/    Future API foundation; not required for the frontend preview
  assets/     Brand assets and product files
  docs/       Setup and architecture notes
  AGENTS.md   Project instructions
  README.md   This guide
```

## Run The Frontend

From PowerShell:

```powershell
cd "C:\Users\bhold\OneDrive\Documents\TapLex\frontend"
npm.cmd install
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000/`.

## Profile Persistence

The profile builder is at `/profile-builder`. Profiles are published at `/profile/[username]`.

- With all Firebase environment values configured, TapLex saves to Firestore using the signed-in Firebase Auth UID.
- Without Firebase configuration, TapLex saves to a versioned localStorage store in the current browser.
- Usernames are reserved case-insensitively through `usernames/{usernameLower}`.
- New profiles start on `free`; booking links are retained only for `pro` and `business` profiles.
- Profile and cover images upload to owner-scoped Firebase Storage paths with a 5 MB image limit.
- Public profiles can show an optional phone number and download a `.vcf` contact card.

Firebase setup and security rules are documented in `docs/FIREBASE_PROFILE_SETUP.md`.

## Checks

```powershell
cd "C:\Users\bhold\OneDrive\Documents\TapLex\frontend"
npm.cmd test -- --runInBand
npm.cmd run build
```

## Main Routes

```text
/
/pricing
/discover
/register
/login
/dashboard
/profile-builder
/profile/demo
/profile/[username]
/admin-dashboard
```
