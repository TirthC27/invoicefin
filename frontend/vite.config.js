import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rpcUrl = env.VITE_ALCHEMY_RPC_URL?.trim() || env.VITE_POLYGON_AMOY_RPC_URL?.trim()

  if (!rpcUrl) {
    throw new Error('Missing VITE_ALCHEMY_RPC_URL or VITE_POLYGON_AMOY_RPC_URL - set one in frontend/.env')
  }

  return {
    plugins: [react(), tailwindcss()],
  }
})
