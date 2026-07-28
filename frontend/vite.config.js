import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (!env.VITE_ALCHEMY_RPC_URL?.trim()) {
    throw new Error('Missing VITE_ALCHEMY_RPC_URL - set this in frontend/.env')
  }

  return {
    plugins: [react(), tailwindcss()],
  }
})
