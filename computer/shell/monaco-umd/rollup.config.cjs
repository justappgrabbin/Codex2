const { RollupMonacoBundler } = require('rollup-monaco-bundler');
const bundler = new RollupMonacoBundler({
  srcDir: 'tmp/0.52.2',
  outputDir: 'dist/0.52.2',
});
module.exports = bundler.entries.map((entry) => bundler.makeEntryOptions(entry));
