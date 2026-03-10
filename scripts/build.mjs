import * as esbuild from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve paths from the repository root so the script behaves the same whether
// it is run from npm scripts or directly via `node scripts/build.mjs`.
const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = resolve(rootDirectory, 'dist');
const watchMode = process.argv.includes('--watch');

// Shared esbuild options for both the extension-host and preview bundles.
const sharedOptions = {
  absWorkingDir: rootDirectory,
  bundle: true,
  logLevel: 'info',
  minify: !watchMode,
  sourcemap: watchMode,
  target: 'es2022'
};

// The extension host runs in Node, while the preview script runs in the browser.
// They need separate bundles even though they are part of one extension.
const buildTargets = [
  {
    ...sharedOptions,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node'
  },
  {
    ...sharedOptions,
    entryPoints: ['src/preview/index.ts'],
    outfile: 'dist/preview.js',
    format: 'iife',
    globalName: 'MarkdownAbcPreview',
    platform: 'browser'
  }
];

/**
 * Rebuilds the dist directory from scratch so deleted outputs do not linger
 * between runs.
 */
async function buildOnce() {
  rmSync(distDirectory, { force: true, recursive: true });
  mkdirSync(distDirectory, { recursive: true });
  await Promise.all(buildTargets.map((target) => esbuild.build(target)));
}

/**
 * Runs a single production build or starts esbuild watch contexts for local
 * extension development.
 */
async function main() {
  if (!watchMode) {
    await buildOnce();
    return;
  }

  console.log('[watch] build started');
  await buildOnce();
  console.log('[watch] build finished');

  const contexts = await Promise.all(buildTargets.map((target) => esbuild.context(target)));
  await Promise.all(contexts.map((context) => context.watch()));
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});