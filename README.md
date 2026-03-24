# RentSure Web

RentSure web application for:

- public landing page
- signup, email verification, login, and reset-password flows
- renter workspace
- landlord and agent workspace
- admin rent-score operations

## Stack

- React 19
- Vite 7
- TypeScript
- Tailwind CSS
- Radix UI

## Project structure

This standalone repo includes the shared design tokens package the app depends on:

- `src/` application source
- `public/` favicon and static assets
- `packages/design-tokens/` shared RentSure design tokens used by the web app

## Requirements

- Node.js 20+
- npm 10+
- RentSure API running locally or remotely

## Local setup

1. Install dependencies

```bash
npm install
```

2. Create your env file

```bash
cp .env.example .env
```

3. Start the app

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

## Available scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Environment variables

### Required

- `VITE_API_BASE_URL`
  - Base URL of the RentSure API
  - Example: `http://localhost:4100`

## Deployment notes

- Build with:

```bash
npm run build
```

- The production frontend must point `VITE_API_BASE_URL` to the deployed backend.
- If you use a reverse proxy instead of a full API URL, make sure `/api` routes are forwarded to the RentSure backend.
- Email verification, password reset, renter invites, and report sharing depend on the backend mail preview/live mail flow.

## Main user areas

- `/` landing page
- `/signup`
- `/verify-email`
- `/login`
- `/account/renter/*`
- `/account/*` for landlord and agent workspace
- `/app/*` for admin operations
