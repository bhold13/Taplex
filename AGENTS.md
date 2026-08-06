# TapLex Agent Instructions

## Project Shape

- The runnable frontend lives in `frontend/`.
- Frontend source lives in `frontend/src/`.
- Static frontend assets live in `frontend/public/`.
- Backend/API work belongs in `backend/`.
- Product notes, setup docs, database rules, deployment notes, and test plans belong in `docs/`.
- Brand files, logos, images, and product photos belong in `assets/`.

## Frontend

- This is a Next.js App Router project using JavaScript.
- Keep imports using the `@/` alias, which points to `frontend/src/`.
- Keep reusable UI in `frontend/src/components/`.
- Keep route files in `frontend/src/app/`.
- Keep shared helpers in `frontend/src/lib/`.
- Use CSS Modules for component-specific styling.

## Commands

Run frontend commands from `frontend/`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Run backend commands from `backend/` only when API work is needed.

## Safety

- Do not move app files out of `frontend/src/` unless the README is updated too.
- Do not put secrets in frontend files.
- Keep generated folders such as `node_modules/`, `.next/`, `.venv/`, and cache folders out of source control.
