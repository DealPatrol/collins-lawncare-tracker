import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'ios']),
  {
    files: ['check-firebase.js', 'scripts/**/*.js', 'api/**/*.js', 'lib/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['check-firebase.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Standalone Node CLI script (run via `node check-firebase.js`), not part
    // of the Vite app bundle — needs Node globals (process, etc.), not browser.
    files: ['check-firebase.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
