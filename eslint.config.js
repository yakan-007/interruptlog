import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    '**/coverage/**',
    '**/dist/**',
    '**/ios/**',
    '**/node_modules/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['src/state/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../screens/*', '../components/*', '../app/*', '../useAppState*', '../persistence/*'],
            message: 'State modules must stay UI- and persistence-independent.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/lib/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../screens/*', '../components/*', '../app/*', '../useAppState*', '../persistence/*', '../state/*'],
            message: 'Lib modules should not depend on app, screen, persistence, or state layers.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/screens/**/*.{js,jsx}', 'src/components/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../state/*', '../../state/*', '../../../state/*'],
            message: 'Screens and components must use the public state API or view actions, not state internals.',
          },
        ],
      }],
    },
  },
])
