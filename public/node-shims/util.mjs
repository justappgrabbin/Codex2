export const promisify = fn => (...args) => new Promise((ok, no) => fn(...args, (e, ...r) => e ? no(e) : ok(r.length > 1 ? r : r[0])));
export default { promisify };
