import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Integração passa pelo túnel SSH até a VM: mais lenta que testes unitários.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ['reflect-metadata'],
  },
});
