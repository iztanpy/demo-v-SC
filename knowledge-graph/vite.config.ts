import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' so the built dist/ works when served from any path/port (offline-safe).
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
