import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
