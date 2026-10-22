import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/seoul-commercial-analysis/',
  preview: { port: 4273 },
  build: {
    // Keep earlier local build artifacts; this task does not delete files.
    emptyOutDir: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
