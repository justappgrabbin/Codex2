// Browser stand-in for node:url. In the browser, module "paths" are http(s) URLs, so the
// path string IS the URL. fileURLToPath keeps the href; pathToFileURL turns it back.
export const fileURLToPath = u => (u instanceof URL ? u.href : String(u));
export const pathToFileURL = p => new URL(String(p), globalThis.location?.href);
const URL_ = globalThis.URL; export { URL_ as URL };
export default { fileURLToPath, pathToFileURL, URL: URL_ };
