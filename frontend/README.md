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
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
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
	- `VITE_CONTRACT_ADDRESS`
7. Click **Deploy**.

## Notes

- This project includes a `vercel.json` rewrite so React Router routes (like `/auth`) work on refresh.
- If `VITE_CONTRACT_ADDRESS` is missing, blockchain interactions will use the fallback zero address.
