// node tools/farm-sim.mjs [days] [seed]
// Bundles tools/farmSim.ts (TypeScript) and runs it.

import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const outfile = join(tmpdir(), `farm-sim-${Date.now()}.mjs`);
await build({ entryPoints: [join(import.meta.dirname, 'farmSim.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' });
await import(pathToFileURL(outfile).href);
