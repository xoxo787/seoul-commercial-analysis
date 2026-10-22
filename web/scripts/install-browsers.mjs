import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The free Chromium download and cache stay within web/.
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url)),
  'install', 'chromium',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: fileURLToPath(new URL('../.cache/ms-playwright', import.meta.url)),
  },
});
process.exit(result.status ?? 1);
