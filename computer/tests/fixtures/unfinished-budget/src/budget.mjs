import { currency } from './settings.mjs';
// TODO: Sum all transactions rather than returning only the first entry.
export function balance(entries) { return `${currency}${(entries[0] ?? 0).toFixed(2)}`; }
