// node tools/casino-stats.mjs [spinsPerRun] [featuresPerDistribution]
// Bundles tools/casinoStats.ts (TypeScript, imports the real machine logic) and runs it.

import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const outfile = join(tmpdir(), `casino-stats-${Date.now()}.mjs`);
await build({ entryPoints: [join(import.meta.dirname, 'casinoStats.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' });
await import(pathToFileURL(outfile).href);
