// Copied from Alexis's original Self-Helpton Foundry
// (computer/donors/copied/self-helpton-foundry/index.html).
// These values and functions are her code, not rewrites.

export const modes = [
  { name: 'Dark Nudge', msg: '<strong>Step 1 (5 min):</strong> Edit Button component. Add props. Say "done 1" when ready.' },
  { name: 'Brief Steps', msg: '<strong>Why:</strong> Building reusable UI library.<br><strong>Steps:</strong> 1) Define props 2) Add styling 3) Export' },
  { name: 'Menu Choice', msg: '<strong>Choose:</strong> A) Simple button B) Styled variants C) Accessible ARIA<br>Recommended: B' },
  { name: 'Full Context', msg: '<strong>Goal:</strong> Production button<br><strong>Risks:</strong> API changes<br><strong>Confirm to proceed</strong>' }
];

export const dims = {
  Movement: { symbol: '⟡', color: '#059669', field: 'Spirit' },
  Evolution: { symbol: '⟁', color: '#dc2626', field: 'Mind' },
  Being: { symbol: '⬢', color: '#ea580c', field: 'Body' },
  Design: { symbol: '◇', color: '#7c3aed', field: 'Soul' },
  Space: { symbol: '◉', color: '#4f46e5', field: 'Heart' }
};

export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export function detectDim(code) {
  const l = code.toLowerCase();
  if (l.includes('ai') || l.includes('generate')) return 'Movement';
  if (l.includes('state') || l.includes('effect')) return 'Evolution';
  if (l.includes('api') || l.includes('fetch')) return 'Being';
  if (l.includes('function') || l.includes('class')) return 'Design';
  return 'Space';
}

// Thin glue around her glyph() body: returns the values she writes into the DOM,
// so the panel can apply them to the current Monaco file content.
export function computeGlyph(code) {
  const hash = simpleHash(code);
  const dim = detectDim(code);
  const d = dims[dim];
  const counter = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  const glyph = `${d.symbol}-${dim.slice(0,6).toUpperCase()}-${counter}`;
  return {
    symbol: d.symbol,
    color: d.color,
    name: glyph,
    id: `blake3:${hash.slice(0,32)}`,
    dimension: dim,
    field: d.field,
  };
}

// Same formula as her animateResonance().
export function randomResonance() {
  const out = {};
  ['mind', 'body', 'heart', 'spirit', 'soul'].forEach((f) => {
    out[f] = Math.floor(Math.random() * 30 + 70);
  });
  return out;
}
