// node tools/farm-check.mjs
// Bundles tools/farmCheck.ts (TypeScript) and runs it.

import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const outfile = join(tmpdir(), `farm-check-${Date.now()}.mjs`);
await build({ entryPoints: [join(import.meta.dirname, 'farmCheck.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' });
await import(pathToFileURL(outfile).href);
