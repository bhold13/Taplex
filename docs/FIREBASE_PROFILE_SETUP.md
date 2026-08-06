# Firebase Profile Setup

TapLex automatically uses Firestore when every `NEXT_PUBLIC_FIREBASE_*` value is present. Without those values, the same profile flow uses browser localStorage for local preview.

## Firebase Console

1. Create or open the TapLex Firebase project.
2. Enable Email/Password under Authentication > Sign-in method.
3. Create a Firestore database.
4. Enable Firebase Storage.
5. Add a Web app and copy its public configuration values.
6. Paste the contents of `frontend/firestore.rules` into Firestore > Rules and publish them.
7. Paste the contents of `frontend/storage.rules` into Storage > Rules and publish them.

As of July 2026, the current TapLex Firebase project requires a billing-plan upgrade before Cloud Storage can be enabled. Firestore profile data works on the current plan, but profile and cover uploads cannot be published until Storage is activated. Do not start the upgrade from the frontend; complete billing changes only in the Firebase Console as the project owner.

## Local Environment

Create `frontend/.env.local` from `frontend/.env.example`, then fill in:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Restart the development server after changing environment values.

## Firestore Documents

Each saved profile uses two documents in one transaction:

```text
profiles/{uid}
usernames/{usernameLower}
```

The lookup document reserves the lowercase username. A rename creates the new reservation and removes the old reservation in the same transaction. Plan and verification values are preserved on profile edits; new users always start on `free`.

The included rules allow public reads only for profiles with `isPublic: true`, allow owners to edit their own profiles, prevent browser clients from upgrading their own plan, and require the profile and username lookup to agree.

## Image Storage

Profile images upload to:

```text
profile-images/{uid}/profile-photo
cover-images/{uid}/cover-image
```

The included Storage rules allow public reads for profile rendering, but only the signed-in owner can create, replace, or delete images in that owner folder. Uploads are limited to JPG, PNG, WebP, or GIF images up to 5 MB. No Firebase Admin credentials belong in the frontend.

If the Firebase CLI is configured for the project, deploy both rule files from `frontend` with:

```powershell
firebase deploy --only firestore:rules,storage
```
