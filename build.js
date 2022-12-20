/* eslint-disable @typescript-eslint/no-var-requires */
const { build } = require('esbuild');
const { dependencies, peerDependencies } = require('./package.json');
const { Generator } = require('npm-dts');

/** @type {import('esbuild').BuildOptions} */
const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  external: Object.keys(dependencies ?? {}).concat(
    Object.keys(peerDependencies ?? {})
  ),
};

new Generator({
  entry: 'src/index.ts',
  output: 'dist/index.d.ts',
}).generate();

build({
  ...sharedConfig,
  platform: 'node', // for CJS
  outfile: 'dist/index.js',
});

build({
  ...sharedConfig,
  outfile: 'dist/index.esm.js',
  platform: 'neutral', // for ESM
  format: 'esm',
});
