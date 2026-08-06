# Security Test Plan

## Authentication

- Verify every protected backend route rejects requests without a Firebase bearer token when `ALLOW_DEV_AUTH=false`.
- Verify revoked Firebase ID tokens are rejected.
- Verify admin routes require the `admin` custom claim.

## Authorization

- Profile owners can edit only their own profiles.
- NFC tags can be claimed, activated, and deactivated only by the owning profile user.
- Messages are readable only by sender, recipient, or admin.
- Marketplace listings can be changed only by seller or admin.

## Abuse Resistance

- Exercise backend rate limiting with repeated requests from one client.
- Verify message reporting creates moderation records.
- Verify blocked users cannot open new message threads after block enforcement is added.

## Data Protection

- Confirm Firebase credentials and Stripe secrets never appear in frontend bundles.
- Confirm Firestore rules deny direct writes to payments, subscriptions, analytics, and audit logs by non-admin users.
- Confirm Firebase Storage rejects oversized or non-media uploads.

## OWASP Coverage

- Injection: Pydantic input validation and Firestore parameterized SDK operations.
- Broken auth: Firebase token verification, revoked-token checks, admin role checks.
- Sensitive data exposure: server-side secrets only and HTTPS deployment targets.
- Security misconfiguration: environment examples, rules, CI checks, and production docs.
- Logging and monitoring: audit logs for admin actions; cloud provider monitoring required in deployment.
