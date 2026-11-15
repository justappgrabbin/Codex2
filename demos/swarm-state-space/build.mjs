// Builds index.html for the small swarm-on-state-space demo.
// Reads the real metadata already in this repo (no hand-typed tables):
//   SynthAi.HumanDesign/Metadata/Gates.csv  -> gate names, channel pairs, centers
//   SynthAi.HumanDesign/Metadata/Lines.csv  -> wheel position + theme of all 384 lines
//   SynthAi.YiJing/Metadata/KingWen.csv     -> upper/lower trigram of each hexagram
// Usage: node demos/swarm-state-space/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/^﻿/, '');

function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); rows.push(out);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const gatesCsv = parseCsv(read('SynthAi.HumanDesign/Metadata/Gates.csv'));
const linesCsv = parseCsv(read('SynthAi.HumanDesign/Metadata/Lines.csv'));
const kingWen = parseCsv(read('SynthAi.YiJing/Metadata/KingWen.csv'));

const gates = {};
for (const r of gatesCsv) {
  const n = +r.Number;
  gates[n] ??= { n, name: r.Gate, center: r.Center, channels: [] };
  gates[n].channels.push({ name: r.Channel, circuit: r.Circuit });
}
// channel partner = the other gate carrying the same channel name
const byChannel = {};
for (const r of gatesCsv) (byChannel[r.Channel] ??= []).push(+r.Number);
for (const g of Object.values(gates)) for (const c of g.channels) c.partner = byChannel[c.name].find((x) => x !== g.n);

for (const r of linesCsv) {
  const [d, m, s] = r.Angle.split("'").map(Number);
  const lon = SIGNS.indexOf(r.Sign) * 108000 + d * 3600 + m * 60 + s; // arc-seconds on the wheel
  const g = gates[+r.Gate];
  (g.lines ??= {})[+r.Line] = { lon, theme: r.Theme };
}
for (const g of Object.values(gates)) g.start = g.lines[1].lon;
for (const r of kingWen) Object.assign(gates[+r.Number], { upper: r.UpperTrigram, lower: r.LowerTrigram, title: r.Title });

const problems = [];
if (Object.keys(gates).length !== 64) problems.push('expected 64 gates');
for (const g of Object.values(gates)) {
  if (Object.keys(g.lines).length !== 6) problems.push(`gate ${g.n} lines`);
  if (!g.upper) problems.push(`gate ${g.n} trigrams`);
  if (g.channels.some((c) => !c.partner)) problems.push(`gate ${g.n} channel partner`);
}
if (problems.length) throw new Error(problems.join('; '));

const data = { signs: SIGNS, gates: Object.values(gates) };
const tpl = readFileSync(join(here, 'template.html'), 'utf8');
writeFileSync(join(here, 'index.html'), tpl.replace('/*__DATA__*/null', JSON.stringify(data)));
console.log(`index.html written: ${data.gates.length} gates, ${data.gates.reduce((a, g) => a + 6, 0)} line cells, ${Object.keys(byChannel).length} channels`);
