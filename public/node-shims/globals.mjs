// Node globals the runtime expects, provided in the browser before the computer boots.
// Buffer is feross/buffer v6 (MIT), bundled into buffer.mjs.
import { Buffer } from '/node-shims/buffer.mjs';
globalThis.Buffer ??= Buffer;
globalThis.process ??= { env: {}, platform: 'browser', cwd: () => '/', versions: {}, nextTick: (f, ...a) => queueMicrotask(() => f(...a)) };
