import { esc, typo, parseDoc, renderBlocks, rng, slugify } from './markup.mjs';

/* ---------- links ---------- */
const L = (route, path, label, cls = '', extra = '') =>
  `<a href="${path}" data-route="${route}"${cls ? ` class="${cls}"` : ''}${extra}>${label}</a>`;

export const paths = {
  home: '/',
  questions: '/the-questions/',
  signal: '/signal/',
  accord: (a) => `/accords/${a.slug}/`,
  charter: (c) => `/charters/${c.slug}/`,
  blueprint: (b) => `/blueprints/${b.slug}/`,
};
export const ids = {
  accord: (a) => a.edition.toLowerCase(),
  charter: (c) => c.version.toLowerCase(),
  blueprint: (b) => `bp-${b.slug}`,
};

/* ---------- shared chrome ---------- */
const topbar = (trail) => `
<nav class="topbar" aria-label="Vault">
  ${L('home', paths.home, '<span class="tb-glyph" aria-hidden="true">⚶</span><span>The Vault</span>', 'tb-home alive')}
  <span class="tb-trail">${trail}</span>
  ${L('signal', paths.signal, 'Send Signal', 'tb-signal alive')}
</nav>`;

const footer = () => `
<footer class="v-foot">
  <div class="v-foot-mark" aria-hidden="true">⧈</div>
  <p class="v-foot-line">remember what the noise forgot.</p>
  <nav class="v-foot-nav" aria-label="Footer">
    ${L('home', paths.home, 'The Vault')}
    ${L('questions', paths.questions, 'The Questions')}
    ${L('signal', paths.signal, 'Send Signal')}
  </nav>
  <p class="v-foot-cr">Codified Resonance</p>
</footer>`;

/* ---------- generated art (deterministic, replaced by an image if one is set) ---------- */
function accordArt(seed) {
  const r = rng(seed);
  let stars = '';
  for (let i = 0; i < 46; i++) {
    stars += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(r() * 225).toFixed(1)}" r="${(r() * 0.9 + 0.2).toFixed(2)}" opacity="${(r() * 0.6 + 0.15).toFixed(2)}" style="animation-delay:${(r() * 6).toFixed(1)}s"/>`;
  }
  const cx = 250 + r() * 120, cy = 330 + r() * 60, R = 230 + r() * 40;
  const tilt = (-24 + r() * 16).toFixed(1);
  const g = `ag${slugify(seed)}`;
  return `<svg class="ac-art" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe6ff" stop-opacity="0"/><stop offset=".35" stop-color="#cfe6ff" stop-opacity=".85"/><stop offset=".8" stop-color="#78d2ff" stop-opacity=".12"/><stop offset="1" stop-color="#78d2ff" stop-opacity="0"/></linearGradient></defs>
  <g class="ac-art-stars" fill="#dfeaf3">${stars}</g>
  <circle class="ac-art-limb" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${R.toFixed(0)}" fill="#030507" stroke="url(#${g})" stroke-width="1.4"/>
  <g class="ac-art-orbit" style="transform-origin:200px 112px">
    <ellipse cx="200" cy="112" rx="150" ry="52" fill="none" stroke="rgba(120,210,255,.2)" stroke-width=".7" transform="rotate(${tilt} 200 112)"/>
    <g transform="rotate(${tilt} 200 112)"><circle class="ac-art-body" cx="350" cy="112" r="2.2" fill="#dff1ff"/></g>
  </g>
</svg>`;
}

function latticeArt(seed, cols = 9, rows = 5) {
  const r = rng(seed);
  const W = 400, H = 225, pts = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    pts.push([(x + 0.5) * (W / cols) + (r() - 0.5) * 22, (y + 0.5) * (H / rows) + (r() - 0.5) * 20]);
  }
  let lines = '', nodes = '';
  const at = (x, y) => pts[y * cols + x];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const [ax, ay] = at(x, y);
    const link = (bx, by) => { if (r() < 0.62) lines += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}" style="animation-delay:${(r() * 4).toFixed(2)}s"/>`; };
    if (x < cols - 1) link(...at(x + 1, y));
    if (y < rows - 1) link(...at(x, y + 1));
    if (x < cols - 1 && y < rows - 1 && r() < 0.3) link(...at(x + 1, y + 1));
    const lit = r() < 0.2;
    nodes += `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${lit ? 2.1 : 1.1}"${lit ? ' class="lit"' : ''} style="animation-delay:${(r() * 5).toFixed(2)}s"/>`;
  }
  return `<svg class="lat-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="lat-lines">${lines}</g><g class="lat-nodes">${nodes}</g></svg>`;
}

const media = (doc, art) => (doc.image ? `<img src="${esc(doc.image)}" alt="" loading="lazy">` : art);

/* ---------- cards ---------- */
const accordCard = (a) => `
<article class="ac-card alive" data-card data-title="${esc(a.title.toLowerCase())}" data-tag="${esc(a.tags.join(','))}">
  ${L(ids.accord(a), paths.accord(a), `<span class="sr">${esc(a.title)}</span>`, 'card-link')}
  <div class="ac-media">${media(a, accordArt(a.edition))}<span class="ac-ed">${a.edition}</span></div>
  <div class="ac-body">
    <div class="ac-head"><span class="ac-eyebrow">${esc(a.form)}</span><span class="ac-state">${esc(a.status)}</span></div>
    <h3 class="ac-name">${typo(a.title)}</h3>
    <p class="ac-line">${typo(a.line)}</p>
    <p class="ac-meta">${typo(a.scope)}</p>
  </div>
</article>`;

const charterCard = (c) => `
<article class="ch-card alive" data-card data-title="${esc(c.title.toLowerCase())}" data-tag="${esc(c.tags.join(','))}">
  ${L(ids.charter(c), paths.charter(c), `<span class="sr">${esc(c.title)}</span>`, 'card-link')}
  <div class="ch-rail"><span class="ch-rail-left">${esc(c.jurisdiction)} Charter</span><span class="ch-rail-right">${c.version}</span></div>
  <div class="ch-media"><div class="ch-plate"></div><div class="ch-plate-grid"></div><div class="ch-plate-scan"></div>
    <span class="ch-plate-code">${c.version}</span><span class="ch-plate-type">${esc(c.plate)}</span><span class="ch-plate-mark"></span></div>
  <div class="ch-body">
    <p class="ch-eyebrow">${esc(c.domain)}</p>
    <h3 class="ch-name">${typo(c.title)}</h3>
    <p class="ch-summary">${typo(c.card)}</p>
    <p class="ch-meta">${c.tags.map(esc).join(' / ')} · ${esc(c.status)}</p>
  </div>
</article>`;

const blueprintCard = (b) => `
<article class="v-card alive" data-card data-state="${b.state}" data-title="${esc(b.title.toLowerCase())}" data-tag="${esc(b.tags.join(','))}" style="--hue:${b.hue}">
  ${L(ids.blueprint(b), paths.blueprint(b), `<span class="sr">${esc(b.title)}</span>`, 'card-link')}
  <div class="v-media">${media(b, latticeArt(b.slug))}</div>
  <div class="v-body">
    <div class="v-head"><span class="v-eyebrow">Blueprint</span><span class="v-state"><i class="orb"></i>${b.state === 'sealed' ? 'Sealed' : 'Gifted'}</span></div>
    <h3 class="v-name">${typo(b.title)}</h3>
    <p class="v-meta">${typo(b.line)}</p>
  </div>
</article>`;

/* ---------- home: the Vault ---------- */
export function home({ accords, charters, blueprints }) {
  const chips = (forId, list) => `<div class="v-tags" data-for="${forId}" hidden>${list.map((t) => `<button type="button" class="v-chip alive" data-tag="${t.toLowerCase()}">${t}</button>`).join('')}</div>`;
  return `
<section id="vault-portal" aria-label="The Vault">
  <div class="v-wrap">
    <header class="v-hero">
      <p class="v-kicker">Codified Resonance</p>
      <h1 class="v-title">THE VAULT</h1>
      <p class="v-tag">Where the living architecture of the new world converges.</p>
      <div class="v-pulse" aria-hidden="true"></div>
      <p class="v-micro">Accords and Charters at the core. Blueprints below. Everything here lives.</p>
    </header>

    <div class="v-controls">
      <div class="v-tabs" role="tablist" aria-label="Vault chambers">
        <button class="v-tab alive" role="tab" aria-selected="true" data-panel="all"><span>The Whole Vault</span></button>
        <button class="v-tab alive" role="tab" aria-selected="false" data-panel="accords"><span>Accords</span></button>
        <button class="v-tab alive" role="tab" aria-selected="false" data-panel="charters"><span>Charters</span></button>
        <button class="v-tab alive" role="tab" aria-selected="false" data-panel="blueprints"><span>Blueprints</span></button>
      </div>
      <div class="v-search" role="search"><input id="vault-search" type="search" placeholder="Search titles…" aria-label="Search titles"></div>
    </div>
    ${chips('accords', ['Cosmic', 'Planetary', 'Non-Interference', 'Stewardship', 'Celestial Rights', 'Deep Time'])}
    ${chips('charters', ['Local', 'Robotics', 'Algorithms', 'Protection'])}
    ${chips('blueprints', ['Signal', 'Identity', 'Consciousness', 'Economy'])}
  </div>

  <section class="chamber chamber-accords" data-chamber="accords" aria-labelledby="h-accords">
    <header class="chamber-head"><h2 id="h-accords">Accords</h2><p>Civilisational agreements and witnessed principles.</p></header>
    <div class="ac-grid">${accords.map(accordCard).join('')}</div>
    <p class="v-empty" hidden>Nothing here matches.</p>
  </section>

  <section class="chamber chamber-charters" data-chamber="charters" aria-labelledby="h-charters">
    <header class="chamber-head"><h2 id="h-charters">Charters</h2><p>Local, civic and operative instruments.</p></header>
    <div class="ch-grid">${charters.map(charterCard).join('')}</div>
    <p class="v-empty" hidden>Nothing here matches.</p>
  </section>

  <div class="v-divide" data-divide aria-hidden="true"><span></span><i>below</i><span></span></div>

  <section class="chamber chamber-blueprints" data-chamber="blueprints" aria-labelledby="h-blueprints">
    <header class="chamber-head"><h2 id="h-blueprints">Blueprints</h2><p>The foundational build layer. Gifted, or sealed.</p></header>
    <div class="v-grid">${blueprints.map(blueprintCard).join('')}</div>
    <p class="v-empty" hidden>Nothing here matches.</p>
  </section>

  <section class="q-threshold alive" data-threshold aria-label="The Questions">
    ${L('questions', paths.questions, '<span class="sr">Enter The Questions</span>', 'card-link')}
    <p class="q-kicker">Identity</p>
    <h2 class="q-title">The Questions</h2>
    <p class="q-line">You do not ask these questions. They ask you.</p>
    <p class="q-states"><span data-s="open">Open</span><span data-s="held">Held</span><span data-s="sealed">Sealed</span></p>
  </section>
</section>
${footer()}`;
}

/* ---------- accord chamber ---------- */
export function accordPage(a, all) {
  const secs = parseDoc(a.body);
  const strip = [['Form', a.form], ['Domain', a.domain], ['Scope', a.scope], ['Standing', a.standing]];
  const others = all.filter((x) => x !== a);
  return `
${topbar('Accords')}
<article class="ac-page" data-doc="${a.edition}">
  <header class="ac-opener">
    <p class="ac-kick"><span>Accord</span><span class="pill">${esc(a.status)}</span></p>
    <h1 class="ac-title">${typo(a.title)}</h1>
    <p class="ac-sub">${typo(a.line)}</p>
    <dl class="ac-strip">${strip.map(([k, v]) => `<div><dt>${k}</dt><dd>${typo(v)}</dd></div>`).join('')}</dl>
    <a class="ac-enter alive" href="#accord-text"><span>Enter the Accord</span><i aria-hidden="true"></i></a>
  </header>

  <div class="ac-window" id="accord-text">
    <div class="ac-field-layer" aria-hidden="true"><span class="ac-orbit"></span><span class="ac-orbit ac-orbit-2"></span><span class="ac-arc"></span><span class="ac-mote"></span></div>
    <div class="ac-doc">
      ${secs.map((s) => `<section class="ac-sec rv" id="${s.id}"><h2 class="d-label"><a href="#${s.id}">${typo(s.title)}</a></h2>${renderBlocks(s.blocks, s.id)}</section>`).join('')}
      <section class="ac-sec ac-witness rv" id="witness-note"><h2 class="d-label"><a href="#witness-note">Witness Note</a></h2>${renderBlocks(parseDoc(a.witness)[0].blocks, 'witness-note')}</section>
    </div>
  </div>

  <div class="ac-after">
    <section class="ac-secondary rv" id="preservation-notes"><h2 class="d-label">Preservation Notes</h2>${renderBlocks(parseDoc(a.preservation)[0].blocks, 'preservation-notes')}</section>
    <section class="ac-secondary rv" id="custodial-commentary"><h2 class="d-label">Custodial Commentary</h2>${renderBlocks(parseDoc(a.commentary)[0].blocks, 'custodial-commentary')}</section>

    <dl class="ac-pres rv"><div><dt>Status</dt><dd>${esc(a.status)}</dd></div><div><dt>Edition</dt><dd>${a.edition}</dd></div>
      <div><dt>Reference</dt><dd><button type="button" class="linkish" data-copy-link>Copy link to this Accord</button></dd></div></dl>

    <section class="related rv" aria-label="Other Accords"><h2 class="d-label">Held in the same chamber</h2>
      <div class="ac-grid">${others.map(accordCard).join('')}</div></section>
  </div>
</article>
${footer()}`;
}

/* ---------- charter instrument ---------- */
export function charterPage(c, all, { canPrint }) {
  const secs = parseDoc(c.body);
  const strip = [['Jurisdiction', c.jurisdiction], ['Scope', c.scope], ['Domain', c.domain], ['Standing', c.standing], ['Version', c.version]];
  const others = all.filter((x) => x !== c);
  return `
${topbar('Charters')}
<article class="ch-page" data-doc="${c.version}">
  <header class="ch-auth">
    <p class="ch-kick"><span>Charter</span><span class="pill">${esc(c.status)}</span></p>
    <h1 class="ch-title">${typo(c.title)}</h1>
    <p class="ch-sub">${typo(c.summary)}</p>
    <dl class="ch-strip">${strip.map(([k, v]) => `<div><dt>${k}</dt><dd>${typo(v)}</dd></div>`).join('')}</dl>
  </header>

  <div class="ch-tools">
    <div class="ch-modes" role="group" aria-label="Reading mode">
      <button type="button" class="ch-mode is-on" data-mode="vault" aria-pressed="true">Vault Mode</button>
      <button type="button" class="ch-mode" data-mode="paper" aria-pressed="false">Paper Mode</button>
    </div>
    <div class="ch-actions">
      <button type="button" class="ch-act" data-copy-link>Copy link</button>
      ${canPrint ? '<button type="button" class="ch-act" data-print>Print / save PDF</button>' : ''}
    </div>
  </div>

  <div class="ch-layout">
    <nav class="ch-index" aria-label="Sections">
      <p class="ch-index-h">${c.version}</p>
      <ol>${secs.map((s) => `<li><a href="#${s.id}">${typo(s.title)}</a></li>`).join('')}</ol>
    </nav>
    <div class="ch-doc-panel">
      ${secs.map((s) => `<section class="ch-sec" id="${s.id}"><h2 class="d-label"><a href="#${s.id}">${typo(s.title)}</a></h2>${renderBlocks(s.blocks, s.id)}</section>`).join('')}
    </div>
  </div>

  <footer class="ch-standing">
    <dl><div><dt>Standing</dt><dd>${typo(c.standing)}</dd></div><div><dt>Version</dt><dd>${c.version}</dd></div><div><dt>Status</dt><dd>${esc(c.status)}</dd></div></dl>
    <p class="ch-adopt">Taking this Charter to a council, authority or institution? ${L('signal', paths.signal, 'Send a signal', 'linkish', ` data-topic="${c.version} · ${esc(c.title)}"`)} and say where.</p>
  </footer>

  <section class="related" aria-label="Other Charters"><h2 class="d-label">The other instruments</h2>
    <div class="ch-grid">${others.map(charterCard).join('')}</div></section>
</article>
${footer()}`;
}

/* ---------- the questions ---------- */
export function questionsPage(q) {
  const question = (it) => `
<article class="tq-question" data-category="${esc(it.category)}"${it.hinge ? ` data-hinge="${it.hinge.to}"` : ''}>
  <div class="tq-question-meta"><span class="tq-question-number">${it.number}</span><span class="tq-question-category">${esc(it.category)}</span></div>
  <h3 class="tq-question-text">${typo(it.text)}</h3>
  <p class="tq-gloss">${typo(it.gloss)}</p>
  ${it.hinge ? `<p class="tq-hinge">${esc(it.hinge.label)}</p>` : ''}
</article>`;
  const set = (s) => `
<section class="tq-set" data-state="${s.state}">
  <div class="tq-set-head">
    <span class="tq-set-index">${s.index}</span>
    <h2 class="tq-set-name">${s.name}</h2>
    <span class="tq-set-count">${s.questions ? `${s.questions.length} questions` : 'Not yet open'}</span>
    <span class="tq-status">${s.status}</span>
  </div>
  ${s.questions ? s.questions.map(question).join('') : `<div class="tq-sealed-panel alive">${s.sealed.map((l) => `<p class="tq-sealed-copy">${typo(l)}</p>`).join('')}</div>`}
</section>`;
  return `
${topbar('Identity')}
<section class="tq-chamber" aria-labelledby="tq-title">
  <div class="tq-shell">
    <header class="tq-arrival">
      <p class="tq-kicker">${q.kicker}</p>
      <h1 id="tq-title" class="tq-title">${q.title}</h1>
      <p class="tq-subline">${q.subline.join('<br>')}</p>
      <p class="tq-operative">${typo(q.operative)}</p>
      <div class="tq-preface">${q.preface.map((p) => `<p>${typo(p)}</p>`).join('')}<p class="tq-preface-note">${typo(q.prefaceNote)}</p></div>
    </header>
    <section class="tq-first-crossing" aria-hidden="true"></section>
    <main class="tq-procession">${q.sets.map(set).join('')}</main>
    <footer class="tq-closing">
      <p class="tq-closing-line">${typo(q.closingLine)}</p>
      <p class="tq-closing-standing">${typo(q.closingStanding)}</p>
    </footer>
  </div>
</section>
${footer()}`;
}

/* ---------- blueprint ---------- */
export function blueprintBody(b) {
  const secs = parseDoc(b.body);
  return secs.map((s) => `<section class="bp-sec"${s.title ? ` id="${s.id}"` : ''}>${s.title ? `<h2>${typo(s.title)}</h2>` : ''}${renderBlocks(s.blocks, s.id)}</section>`).join('') + '<p class="bp-end" aria-hidden="true">⧈</p>';
}

export function blueprintPage(b, { cipher, stripeUrl }) {
  const sealed = b.state === 'sealed';
  const threshold = sealed
    ? `<form class="bp-keyform" novalidate><label class="sr" for="bp-key">Access key</label><input id="bp-key" name="key" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Access key"><button type="submit" class="bp-btn alive">Unlock</button></form>
       <p class="bp-err" role="alert" hidden></p>
       <p class="bp-note">Sealed. It opens with a key. <a class="linkish" data-acquire href="${stripeUrl ? esc(stripeUrl) : '#'}"${stripeUrl ? ' target="_blank" rel="noopener"' : ''}>Acquire the key</a> or ${L('signal', paths.signal, 'send a signal', 'linkish', ` data-topic="Key request · ${esc(b.title)}"`)}.</p>
       <script type="application/json" class="bp-cipher">${cipher}</script>`
    : `<button type="button" class="bp-btn alive" data-claim>Claim Gift</button>
       <p class="bp-note">Given freely. Claim it and it opens.</p>`;
  return `
${topbar('Blueprints')}
<article class="bp" data-slug="${b.slug}" data-state="${b.state}" style="--hue:${b.hue}">
  <header class="bp-gate">
    <div class="bp-gate-art" aria-hidden="true">${b.image ? `<img src="${esc(b.image)}" alt="">` : latticeArt(b.slug + 'gate', 12, 6)}</div>
    <p class="bp-kicker">Blueprint</p>
    <h1 class="bp-title">${typo(b.title)}</h1>
    <p class="bp-desc">${typo(b.desc)}</p>
    <p class="bp-state" data-label>${sealed ? 'Sealed' : 'Gifted'}</p>
  </header>
  <div class="bp-threshold"><span class="bp-orb" aria-hidden="true"></span>${threshold}</div>
  <div class="bp-content" id="bp-content" hidden><div class="bp-body">${sealed ? '' : blueprintBody(b)}</div></div>
  <nav class="bp-foot" aria-label="Blueprint">
    ${L('home', paths.home, '← Back to Vault')}
    <span>${b.was && b.was !== b.title ? `First issued as ${typo(b.was)}` : 'The Vault · Blueprints'}</span>
    ${L('signal', paths.signal, 'Send Signal', '', ` data-topic="${esc(b.title)}"`)}
  </nav>
</article>
${footer()}`;
}

/* ---------- send signal ---------- */
export function signalPage() {
  return `
${topbar('Signal')}
<div class="signal-page">
  <div class="signal-glyph" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="white" stroke-width="5"><circle cx="50" cy="50" r="10"/><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="45"/></svg></div>
  <div class="transmit-card">
    <header class="tx-head">
      <h1 class="tx-title">Send Signal</h1>
      <p class="tx-sub">Across distance. Into silence. Toward what holds.</p>
      <p class="tx-chip" id="tx-topic" hidden></p>
    </header>
    <form id="tx-form" novalidate>
      <input type="hidden" name="topic" id="tx-topic-field">
      <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" class="tx-trap" aria-hidden="true">
      <div class="tx-field">
        <label class="sr" for="tx-input">Your signal</label>
        <textarea id="tx-input" name="message" class="tx-input" placeholder="Write your signal. What are you aligning, offering, or sensing?" spellcheck="true" required></textarea>
        <div class="tx-underline" aria-hidden="true"></div>
      </div>
      <div id="tx-meta" class="tx-meta" hidden>
        <input name="name" class="tx-input tx-small" placeholder="Name (optional)" autocomplete="name">
        <input name="email" type="email" class="tx-input tx-small" placeholder="Email (optional)" autocomplete="email">
      </div>
      <div class="tx-actions">
        <button type="submit" id="tx-send" class="tx-btn alive"><span>Transmit Signal</span></button>
        ${L('home', paths.home, 'Back to Vault', 'tx-btn alive')}
      </div>
      <p class="tx-links"><button type="button" class="linkish" id="tx-toggle-meta" aria-expanded="false">Add contact info</button></p>
      <p class="tx-err" role="alert" hidden></p>
    </form>
    <div id="tx-sent" class="tx-sent" role="status" aria-live="polite" hidden><p id="tx-sent-line"></p><div class="sent-line" aria-hidden="true"></div></div>
  </div>
</div>
${footer()}`;
}

export function notFound() {
  return `${topbar('')}
<section class="nf"><p class="v-kicker">The Vault</p><h1>Nothing is held here.</h1><p>${L('home', paths.home, 'Return to the Vault', 'linkish')}</p></section>${footer()}`;
}
