import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: ['e2e/**', 'node_modules/**', '.output/**'],
    // The integration suite owns one SQLite file; keep everything sequential.
    fileParallelism: false,
    sequence: { concurrent: false },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'src/lib/**/*.ts',
        'src/server/db.ts',
        'src/server/repo.ts',
        'src/server/schemas.ts',
      ],
      exclude: ['src/lib/types.ts', '**/*.test.ts'],
    },
  },
})
