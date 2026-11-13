export const modes: ReadonlyArray<{ name: string; msg: string }>;
export const dims: Record<string, { symbol: string; color: string; field: string }>;
export function simpleHash(str: string): string;
export function detectDim(code: string): string;
export function computeGlyph(code: string): {
  symbol: string;
  color: string;
  name: string;
  id: string;
  dimension: string;
  field: string;
};
export function randomResonance(): Record<string, number>;
