// Browser stand-in for node:child_process: there are no subprocesses in a page, so these
// report the capability as missing; the runtime marks those backends unavailable.
const missing = name => () => { const e = new Error(`${name}: no subprocesses in the browser`); e.code = 'ENOSYS'; throw e; };
export const execFile = (...args) => { const cb = args.find(a => typeof a === 'function'); const e = new Error('execFile: no subprocesses in the browser'); e.code = 'ENOSYS'; if (cb) queueMicrotask(() => cb(e)); else throw e; };
export const spawn = missing('spawn'), exec = missing('exec');
export default { execFile, spawn, exec };
