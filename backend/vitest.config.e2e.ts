import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Decorators do class-transformer/Nest dependem dos metadados de reflexão.
    setupFiles: ['reflect-metadata'],
    testTimeout: 30_000,
  },
});
