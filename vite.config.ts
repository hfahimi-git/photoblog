import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // relative paths — works for both user.github.io and user.github.io/repo
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  publicDir: 'public',
})
