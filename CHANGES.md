# Changes

## Investment RPC diagnostics and wallet RPC handling

- Confirmed the persistent investment failure was thrown by ethers `BrowserProvider` while calling `eth_blockNumber`, with MetaMask returning `-32002` from its own Polygon Amoy RPC path.
- Kept structured raw transaction error logging in the investor flow so future wallet/RPC failures include the full ethers error object.
- Split the previous generic "RPC rate limit" catch-all into distinct messages for wallet RPC issues, network fetch failures, real rate limits, user cancellation, insufficient funds, backend verification failures, and confirmation timeouts.
- Added a 90-second explicit transaction confirmation timeout and a warning that submitted transactions may still succeed after the app stops waiting.
- Added a proactive wallet RPC health check comparing MetaMask's provider against the app's dedicated Alchemy provider, with an investor portal warning when the wallet RPC fails or is far out of sync.
- Added an 8-second wallet RPC health-check timeout and a 20-second wallet interaction timeout so a stuck MetaMask RPC pre-check produces actionable guidance instead of leaving the invest modal pending.
- Documented the MetaMask Polygon Amoy RPC setup gotcha in the frontend README.

## Cloud Run and Vercel deployment preparation

- Added a pinned backend `requirements.txt` generated from the local Python 3.11 environment plus Cloud Run deployment dependencies for Gunicorn, Postgres URL parsing, Postgres connectivity, and static file serving.
- Added a backend Dockerfile, Docker ignore file, and startup entrypoint that runs migrations before starting Gunicorn on Cloud Run's injected `PORT`.
- Updated Django settings to read `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, CORS origins, and database SSL behavior from environment variables.
- Configured WhiteNoise static file serving and documented the required Cloud Run and Vercel environment variables in `DEPLOYMENT.md`.
