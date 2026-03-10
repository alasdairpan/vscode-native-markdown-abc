import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDirectory = resolve(rootDirectory, 'artifacts');
const packageJson = JSON.parse(execFileSync('node', ['-p', "JSON.stringify(require('./package.json'))"], {
  cwd: rootDirectory,
  encoding: 'utf8'
}));

const vsixFileName = `${packageJson.name}-${packageJson.version}.vsix`;
const vsixOutputPath = resolve(artifactsDirectory, vsixFileName);

rmSync(artifactsDirectory, { force: true, recursive: true });
mkdirSync(artifactsDirectory, { recursive: true });

execFileSync('npx', ['vsce', 'package', '--out', vsixOutputPath], {
  cwd: rootDirectory,
  stdio: 'inherit'
});