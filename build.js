/* eslint-disable @typescript-eslint/no-var-requires */
const { build } = require('esbuild');
const { dependencies, peerDependencies } = require('./package.json');
const { Generator } = require('npm-dts');

/** @type {import('esbuild').BuildOptions} */
const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  target: 'node12',
  external: Object.keys(dependencies ?? {}).concat(
    Object.keys(peerDependencies ?? {})
  ),
};

new Generator({
  output: 'dist/index.d.ts',
})
  .generate()
  .then(
    () => console.log('Types generated'),
    (err) => console.log('Types failed to generate', err)
  );

build({
  ...sharedConfig,
  platform: 'node', // for CJS
  outfile: 'dist/index.js',
}).then(
  (result) => console.log('CJS generated', result),
  (err) => console.log('CJS failed to generate', err)
);

build({
  ...sharedConfig,
  outfile: 'dist/index.esm.js',
  platform: 'node',
  format: 'esm',
}).then(
  (result) => console.log('ESM generated', result),
  (err) => console.log('ESM failed to generate', err)
);
