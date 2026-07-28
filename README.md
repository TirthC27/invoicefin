# InvoiceFin

InvoiceFin is a full-stack invoice financing platform built around four user roles: Investor, Exporter, Law Firm, and Admin. The current repository combines a Django backend, a Vite/React frontend, and a Polygon Amoy smart-contract workflow for on-chain investment verification.

## What this repo contains

- `frontend/` - React + Vite user interface for investor, exporter, law-firm, and admin portals.
- `backend/` - Django REST backend for pools, investments, portfolios, notifications, recovery cases, and role enforcement.
- `blockchain/` - Hardhat project and the `InvoicePool` contract used for on-chain pool creation and investment verification.
- `supabase_schema.sql` - legacy Supabase schema reference and migration history.
- `CHANGES.md` - historical change log and audit notes.

## Architecture

- Supabase handles authentication and profile identity.
- Django is the operational source of truth for pools, investments, transactions, portfolios, notifications, and recovery data.
- Polygon Amoy is the blockchain network used for contract deployment and investment verification.
- The frontend connects to Django APIs for business logic and to MetaMask for signing blockchain transactions.

## Local setup

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Available scripts:

- `npm run dev` - start the Vite dev server.
- `npm run build` - create a production build.
- `npm run lint` - run ESLint.

### Backend

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver
```

### Blockchain

```powershell
cd blockchain
npm install
npx hardhat compile
```

## Environment variables

The code currently reads the following variables:

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CONTRACT_ADDRESS`
- `VITE_ALCHEMY_RPC_URL`
- `VITE_POLYGON_AMOY_RPC_URL`
- `VITE_API_URL`

### Backend / Blockchain

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_LOG_LEVEL`
- `DATABASE_URL`
- `DATABASE_SSL_REQUIRE`
- `CORS_ALLOW_ALL_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTRACT_ADDRESS`
- `CONTRACT_OWNER_PRIVATE_KEY`
- `PRIVATE_KEY`
- `POLYGON_AMOY_RPC_URL`
- `POLYGON_AMOY_CHAIN_ID`
- `INVOICEFIN_BACKGROUND_JOBS`
- `FRONTEND_URL`
- `BREVO_SMTP_SERVER`
- `BREVO_SMTP_PORT`
- `BREVO_USERNAME`
- `BREVO_PASSWORD`
- `EMAIL_FROM`

## Notes

- The frontend build currently succeeds, but the repository still contains lint issues in tracked history files and one exporter dashboard source file.
- The backend Django checks and migrations are currently clean against the configured database.
- The repo includes `.env` files with real values in the working tree; treat them as sensitive.
- The current blockchain target is Polygon Amoy.

## Key flows

- Investor flow: browse pools, invest through MetaMask, verify the on-chain transaction, then persist the investment in Django.
- Exporter flow: upload invoice data, verify invoices, and create pools linked to the blockchain contract.
- Admin and law-firm flows: manage legal cases, assignments, and notifications.

## Reference files

- Frontend entry point: [frontend/src/App.jsx](frontend/src/App.jsx)
- Frontend wallet logic: [frontend/src/context/WalletContext.jsx](frontend/src/context/WalletContext.jsx)
- Frontend blockchain helpers: [frontend/src/lib/contractService.js](frontend/src/lib/contractService.js)
- Backend routes: [backend/core/urls.py](backend/core/urls.py)
- Backend settings: [backend/invoicefin_backend/settings.py](backend/invoicefin_backend/settings.py)
