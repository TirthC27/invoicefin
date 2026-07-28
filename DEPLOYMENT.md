# InvoiceFi Deployment Notes

## Backend Runtime Environment

Set these in Cloud Run. Use Secret Manager for sensitive values where the console offers it.

```env
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=your-cloud-run-service.a.run.app
DATABASE_URL=
DATABASE_SSL_REQUIRE=True
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
SUPABASE_URL=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
CONTRACT_ADDRESS=
POLYGON_AMOY_RPC_URL=
BLOCK_EXPLORER_URL=https://amoy.polygonscan.com/
FRONTEND_URL=https://your-vercel-app.vercel.app
BREVO_SMTP_SERVER=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_USERNAME=
BREVO_PASSWORD=
EMAIL_FROM=
BLOCKCHAIN_PRIVATE_KEY=
```

`BLOCKCHAIN_PRIVATE_KEY` is only needed for backend pool creation flows that submit transactions. If that flow is not used in the deployed demo, omit it.

For Cloud Run + Supabase Postgres, use Supabase's pooled Postgres connection string for `DATABASE_URL` when available.

## Frontend Runtime Environment

Set these in Vercel before building the frontend.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_CONTRACT_ADDRESS=
VITE_ALCHEMY_RPC_URL=
VITE_API_URL=https://your-cloud-run-service.a.run.app/api
```

## Build Settings

### Vercel Frontend

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

The existing `frontend/vercel.json` includes the SPA rewrite needed for React Router refreshes.

### Cloud Run Backend

- Build source: `backend`
- Build type: Dockerfile
- Dockerfile path: `backend/Dockerfile` if the console asks from repo root, or `Dockerfile` if `backend` is selected as the source directory.
- Container listens on Cloud Run's injected `PORT`.
- Startup runs `python manage.py migrate --noinput`, then starts Gunicorn.

## Database

SQLite is only for local development. Cloud Run filesystems are ephemeral, so deployed environments must use `DATABASE_URL` pointing at persistent Postgres, either Supabase Postgres or Cloud SQL Postgres.

Before using production data, run migrations against a throwaway Postgres database or the target Supabase/Cloud SQL database and confirm they apply cleanly.
