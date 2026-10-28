# Stockwise Inventory

Stockwise is a lightweight inventory intake and reconciliation system structured as a small monorepo.

## Repository layout

```text
apps/
  web/       Vite frontend
  api/       Express API + SQLite persistence
mobile/      Capacitor packaging subrepo
```

## Local development

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

- Web app: `http://localhost:5173`
- API health: `http://localhost:4000/health`
- SQLite file: `apps/api/data/stockwise.db`

The database is created and seeded automatically on the first API start. SQLite with WAL mode is deliberately used for this phase: it is fast, portable, inexpensive, and avoids operating a separate database server for a lightweight deployment. The API repository boundary makes it possible to swap the repository implementation for Zoho Catalyst Data Store later without changing the frontend contract.

## Mobile packaging

The `mobile/` workspace is the APK packaging subrepo. After building the web app:

```bash
npm run build --workspace apps/web
npm run sync --workspace mobile
npm run android --workspace mobile
```

Android Studio and the Android SDK are required for APK generation. The mobile app uses the same web frontend; production deployments should point it at the deployed API using the Capacitor server configuration or an environment-aware API client.

## Access and data integrity

The current role selector is a development UX for exercising manager and category-user views. It is not authentication. Production Catalyst authentication must provide the user identity and category scope server-side.

Reconciliation is intentionally a backend transaction: invoice creation, payment creation, and item status update are committed together. Add Catalyst serverless functions for this same boundary when the hosted database is introduced. File uploads should use Catalyst File Store and store only file IDs in invoice/payment records.
