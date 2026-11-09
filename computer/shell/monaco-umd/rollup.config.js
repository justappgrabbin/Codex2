import { RollupMonacoBundler } from 'rollup-monaco-bundler';

const version = '0.52.2';
const bundler = new RollupMonacoBundler({
  srcDir: `tmp/${version}`,
  outputDir: `dist/${version}`,
});

export default bundler.entries.map((entry) => bundler.makeEntryOptions(entry));
