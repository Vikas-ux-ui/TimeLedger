/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { seedDataApiPlugin } from './vite/seedDataApiPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seedDataApiPlugin()],
  server: {
    watch: {
      // The app writes to this file when a logout time is edited. Watching it
      // would turn every edit into a full page reload, throwing away the
      // user's filters and page position. The client updates its own state
      // optimistically, and the next refresh reads the persisted value.
      ignored: ['**/src/data/team-availability-seed-data.json'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
