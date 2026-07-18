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
    // The component tests render the whole page against the real 36-record
    // dataset and drive it through user-event with fake timers, which takes
    // several seconds each. The 5s default leaves no headroom when files run
    // in parallel, producing failures that move between runs.
    testTimeout: 15_000,
  },
})
