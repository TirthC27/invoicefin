# InvoiceFi Frontend

This is a React + Vite app configured for deployment on Vercel.

## Local Development

```bash
npm install
npm run dev
```

## Production Build Check

```bash
npm run build
```

## Environment Variables

Create a local `.env` file in `frontend/` for development:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
VITE_ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_API_URL=http://localhost:8000/api
```

For Vercel, add the same variables in Project Settings -> Environment Variables.

## Deploy To Vercel

1. Push your code to GitHub.
2. Go to Vercel and click **Add New Project**.
3. Import your repository.
4. Set **Root Directory** to `invoicefin/frontend`.
5. Vercel should auto-detect Vite. If needed, use:
	- Build Command: `npm run build`
	- Output Directory: `dist`
6. Add required environment variables:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_SUPABASE_PUBLISHABLE_KEY`
	- `VITE_CONTRACT_ADDRESS`
	- `VITE_ALCHEMY_RPC_URL`
	- `VITE_API_URL`
7. Click **Deploy**.

## MetaMask Polygon Amoy Setup

When adding Polygon Amoy to MetaMask for local development/testing, manually verify the RPC URL is set to a real, dedicated endpoint, such as your Alchemy Polygon Amoy URL, rather than accepting a default public RPC. A wallet's saved network RPC is independent of the app's own `.env` configuration and will not automatically update when `VITE_ALCHEMY_RPC_URL` changes.

## Notes

- This project includes a `vercel.json` rewrite so React Router routes (like `/auth`) work on refresh.
- If `VITE_CONTRACT_ADDRESS` is missing, blockchain interactions will use the fallback zero address.
- If `VITE_ALCHEMY_RPC_URL` is missing, Vite startup fails with a clear configuration error.
- `VITE_API_URL` must point to the deployed backend API root, including `/api` (for example, `https://your-cloud-run-service.a.run.app/api`).
