// Tiny document markup -> HTML. No dependencies.
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escape, then set typographic apostrophes and quotes.
export const typo = (s) =>
  String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(\w)'/g, '$1’')
    .replace(/"([^"]*)"/g, '“$1”');

export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const para = (s) => typo(s).replace(/\n/g, '<br>');

export function parseDoc(src) {
  const sections = [];
  let cur = { title: null, id: 'opening', blocks: [] };
  const push = () => { if (cur.title || cur.blocks.length) sections.push(cur); };
  const chunks = String(src).trim().split(/\n\s*\n/);
  for (const raw of chunks) {
    const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.length);
    if (!lines.length) continue;
    // A heading may be directly followed by content on the next lines.
    while (lines.length && /^#{2,3} /.test(lines[0])) {
      const l = lines.shift();
      if (l.startsWith('## ')) {
        push();
        const title = l.slice(3).trim();
        cur = { title, id: slugify(title), blocks: [] };
      } else {
        cur.blocks.push({ t: 'h3', text: l.slice(4).trim() });
      }
    }
    if (!lines.length) continue;
    const text = lines.join('\n');
    let m;
    if (lines.every((l) => l.startsWith('- '))) {
      cur.blocks.push({ t: 'ul', items: lines.map((l) => l.slice(2)) });
    } else if ((m = text.match(/^(\d+)\. ([^|]+) \| ([\s\S]+)$/))) {
      cur.blocks.push({ t: 'clause', n: m[1], title: m[2].trim(), text: m[3].trim() });
    } else if ((m = text.match(/^\[([IVX]+)\] ([\s\S]+)$/))) {
      cur.blocks.push({ t: 'clause', n: m[1], title: '', text: m[2].trim() });
    } else if ((m = text.match(/^([^:\n]{2,60}) :: ([\s\S]+)$/))) {
      cur.blocks.push({ t: 'def', term: m[1].trim(), text: m[2].trim() });
    } else if (text.startsWith('! ')) {
      cur.blocks.push({ t: 'declare', text: text.slice(2) });
    } else {
      cur.blocks.push({ t: 'p', text });
    }
  }
  push();
  return sections;
}

export function renderBlocks(blocks, secId) {
  let out = '';
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === 'p') out += `<p>${para(b.text)}</p>`;
    else if (b.t === 'h3') out += `<h3 class="d-sub">${typo(b.text)}</h3>`;
    else if (b.t === 'declare') out += `<p class="d-declare">${typo(b.text)}</p>`;
    else if (b.t === 'ul') out += `<ul class="d-list">${b.items.map((x) => `<li>${typo(x)}</li>`).join('')}</ul>`;
    else if (b.t === 'def') {
      let run = '';
      while (i < blocks.length && blocks[i].t === 'def') {
        const d = blocks[i];
        run += `<div class="d-def" id="${secId}-${slugify(d.term)}"><dt>${typo(d.term)}</dt><dd>${para(d.text)}</dd></div>`;
        i++;
      }
      i--;
      out += `<dl class="d-defs">${run}</dl>`;
    } else if (b.t === 'clause') {
      let run = '';
      while (i < blocks.length && blocks[i].t === 'clause') {
        const c = blocks[i];
        const id = `${secId}-${c.n.toLowerCase()}`;
        run += `<li class="d-clause" id="${id}"><a class="d-num" href="#${id}" aria-label="Link to clause ${c.n}">${c.n}</a><div>${c.title ? `<h4>${typo(c.title)}</h4>` : ''}<p>${para(c.text)}</p></div></li>`;
        i++;
      }
      i--;
      out += `<ol class="d-clauses">${run}</ol>`;
    }
  }
  return out;
}

// Seeded random, so generated art is the same on every build.
export function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
