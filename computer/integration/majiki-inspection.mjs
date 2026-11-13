// Extracted verbatim Majiki inspection; scheduling/state remain resident.
const MAX_FILES = 250;

function stripTrailingCommas(text) {
  // JSON-aware comma removal: never rewrite comma/bracket sequences in strings.
  let quoted = false, escaped = false, out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; out += ch; continue; }
    if (ch === ',') {
      let j = i + 1;
      while (/\s/.test(text[j] || '') && j < text.length) j++;
      if (text[j] === '}' || text[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}


function inspect(records) {
  const findings = [];
  for (const item of records.slice(0, MAX_FILES)) {
    if (!item || typeof item.path !== 'string' || typeof item.content !== 'string') continue;
    if (item.content.length > 65000 || item.meta?.encoding === 'base64') continue;
    const path = item.path;
    if (!path.startsWith('/home/user/')) continue;
    if (path.endsWith('.json')) {
      try { JSON.parse(item.content); }
      catch (error) {
        const candidate = stripTrailingCommas(item.content);
        let proposedFix = null;
        if (candidate !== item.content) {
          try { JSON.parse(candidate); proposedFix = candidate; } catch { /* no safe candidate */ }
        }
        findings.push({ type: 'json-parse', path, message: String(error.message), proposedFix });
      }
    }
    const lines = item.content.split('\n');
    for (let i = 0, found = 0; i < lines.length && found < 3; i++) {
      if (/\b(?:TODO|FIXME)\b/i.test(lines[i])) {
        findings.push({ type: 'todo', path, line: i + 1, message: lines[i].trim().slice(0, 180) });
        found++;
      }
    }
    if (findings.length >= 120) break;
  }
  return findings;
}

export { inspect as inspectMajikiSources };
