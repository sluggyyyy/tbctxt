const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src/app.ts');
const src = fs.readFileSync(filePath, 'utf-8');

let out = '';
let i = 0;
const len = src.length;

while (i < len) {
  const ch = src[i];
  const next = src[i + 1];

  // Single-quoted string
  if (ch === "'") {
    let s = ch;
    i++;
    while (i < len && src[i] !== "'") {
      if (src[i] === '\\') { s += src[i++]; }
      s += src[i++];
    }
    if (i < len) s += src[i++]; // closing quote
    out += s;
    continue;
  }

  // Double-quoted string
  if (ch === '"') {
    let s = ch;
    i++;
    while (i < len && src[i] !== '"') {
      if (src[i] === '\\') { s += src[i++]; }
      s += src[i++];
    }
    if (i < len) s += src[i++];
    out += s;
    continue;
  }

  // Template literal (backtick) — supports nested ${} with brace counting
  if (ch === '`') {
    let s = ch;
    i++;
    while (i < len && src[i] !== '`') {
      if (src[i] === '\\') {
        s += src[i++];
        if (i < len) s += src[i++];
        continue;
      }
      if (src[i] === '$' && i + 1 < len && src[i + 1] === '{') {
        s += src[i++]; // $
        s += src[i++]; // {
        let depth = 1;
        while (i < len && depth > 0) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          if (depth > 0) {
            // Inside template expression, preserve strings too
            if (src[i] === "'" || src[i] === '"') {
              const q = src[i];
              s += src[i++];
              while (i < len && src[i] !== q) {
                if (src[i] === '\\') s += src[i++];
                if (i < len) s += src[i++];
              }
              if (i < len) s += src[i++];
              continue;
            }
            if (src[i] === '`') {
              // nested template literal
              s += src[i++];
              let nestedDepth = 0;
              while (i < len && (src[i] !== '`' || nestedDepth > 0)) {
                if (src[i] === '\\') { s += src[i++]; if (i < len) s += src[i++]; continue; }
                if (src[i] === '$' && i + 1 < len && src[i + 1] === '{') { nestedDepth++; s += src[i++]; s += src[i++]; continue; }
                if (src[i] === '}' && nestedDepth > 0) { nestedDepth--; }
                s += src[i++];
              }
              if (i < len) s += src[i++]; // closing backtick
              continue;
            }
            s += src[i++];
          } else {
            s += src[i++]; // closing }
          }
        }
        continue;
      }
      s += src[i++];
    }
    if (i < len) s += src[i++]; // closing backtick
    out += s;
    continue;
  }

  // Regex literal — only after certain tokens
  if (ch === '/') {
    // Check if this could be a regex (rough heuristic)
    const prevNonSpace = out.trimEnd().slice(-1);
    const regexBefore = '=(!<>|&+\\-*%^~([{,;:?';
    if (
      next !== '/' && next !== '*' &&
      (out.length === 0 || regexBefore.includes(prevNonSpace) || /\breturn$|\bcase$|\btypeof$|\bvoid$|\bin$|\bdelete$|\bthrow$|\bnew$|\binstanceof$/.test(out.slice(-10)))
    ) {
      let s = ch;
      i++;
      while (i < len && src[i] !== '/' && src[i] !== '\n') {
        if (src[i] === '\\') { s += src[i++]; }
        if (src[i] === '[') {
          // character class
          s += src[i++];
          while (i < len && src[i] !== ']' && src[i] !== '\n') {
            if (src[i] === '\\') s += src[i++];
            if (i < len) s += src[i++];
          }
        }
        if (i < len) s += src[i++];
      }
      if (i < len) s += src[i++]; // closing /
      // regex flags
      while (i < len && /[gimsuy]/.test(src[i])) s += src[i++];
      out += s;
      continue;
    }
  }

  // Single-line comment
  if (ch === '/' && next === '/') {
    // Skip until end of line (don't consume the newline)
    i += 2;
    while (i < len && src[i] !== '\n') i++;
    continue;
  }

  // Multi-line comment
  if (ch === '/' && next === '*') {
    i += 2;
    while (i < len && !(src[i] === '*' && src[i + 1] === '/')) i++;
    if (i < len) i += 2; // skip */
    continue;
  }

  out += ch;
  i++;
}

// Clean up: trim trailing whitespace on each line
out = out.replace(/[ \t]+$/gm, '');

// Collapse 3+ consecutive blank lines into 2
out = out.replace(/\n{3,}/g, '\n\n');

// Trim leading/trailing whitespace of the whole file
out = out.trim() + '\n';

fs.writeFileSync(filePath, out, 'utf-8');

const origLines = src.split('\n').length;
const newLines = out.split('\n').length;
console.log(`Done. ${origLines} lines -> ${newLines} lines`);
