import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const cache = path.join(root, '.cache', 'ms-playwright');
// Resolve the workspace-local installation in a fresh process before Playwright
// reads its browser registry. A normal global install is still supported in CI.
const localExecutable = existsSync(cache) ? execFileSync(process.execPath, [
  '--input-type=module', '-e', "import { chromium } from 'playwright'; process.stdout.write(chromium.executablePath());",
], { cwd: root, encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: cache } }).trim() : undefined;

const run = process.env.SEOUL_E2E_RUN ?? `run-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
process.env.SEOUL_E2E_RUN = run;
// Preserve earlier evidence in a unique run directory.
const runDirectory = path.join(root, 'test-results', run);
// POSIX Chromium needs short Unix socket paths, so retain the OS temp defaults.
if (process.platform === 'win32') {
  const temporaryDirectory = path.join(runDirectory, 'temporary');
  mkdirSync(temporaryDirectory, { recursive: true });
  process.env.TEMP = temporaryDirectory;
  process.env.TMP = temporaryDirectory;
  process.env.TMPDIR = temporaryDirectory;
}
const port = Number(process.env.SEOUL_E2E_PORT ?? 4273);
const baseURL = `http://127.0.0.1:${port}/seoul-commercial-analysis/`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(runDirectory, 'artifacts'),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: path.join(runDirectory, 'results.json') }]],
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: { executablePath: localExecutable && existsSync(localExecutable) ? localExecutable : undefined },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' } },
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
