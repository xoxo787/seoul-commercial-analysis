import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

let commit = process.env.GITHUB_SHA?.trim();
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    commit = 'unknown';
  }
}

const outputDirectory = new URL('../dist/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const version = { commit, built_at: new Date().toISOString() };
await writeFile(new URL('version.json', outputDirectory), `${JSON.stringify(version, null, 2)}\n`);
console.log(`version.json: ${version.commit} (${version.built_at})`);
