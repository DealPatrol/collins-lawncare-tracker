import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/brand.js'

// Fills %BRAND_*% placeholders in index.html from the single brand module.
function brandHtml() {
  const values = {
    BRAND_NAME: BRAND.name,
    BRAND_DESCRIPTION: `${BRAND.name}: ${BRAND.tagline}`,
  }
  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return html.replace(/%(BRAND_[A-Z_]+)%/g, (m, key) => values[key] ?? m)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandHtml()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
