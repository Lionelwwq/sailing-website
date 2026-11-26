/* How PV glass works (pv-glass.html): the six step cards, the five generation cards and the diagram highlighting.
   Texts come from content/pages/pv-glass.json through site.js (event "sit:pvglass", in the current language). */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // a small picture for each generation: where the panels went
  const ILLO = {
    1: '<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="110" width="240" height="30" class="ground"/><circle cx="200" cy="30" r="16" class="sun-c"/><path d="M60 110V72L100 48L140 72V110Z" class="house"/><path d="M104 52L134 70L126 75L96 57Z" class="panel"/><rect x="88" y="86" width="16" height="24" class="roof"/></svg>',
    2: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="70" width="240" height="70" class="ground"/><circle cx="205" cy="28" r="16" class="sun-c"/>${[0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5].map((c) => `<g transform="translate(${10 + c * 38 + r * 6} ${74 + r * 20})"><path d="M0 10L30 0L34 8L4 18Z" class="panel"/><path d="M4 18V24M30 8V16" class="leg"/></g>`).join('')).join('')}</svg>`,
    3: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="112" width="240" height="28" class="ground"/><circle cx="210" cy="26" r="15" class="sun-c"/>${[[20, 1], [120, 0.85]].map(([x, s]) => `<g transform="translate(${x} ${112 - 80 * s}) scale(${s})"><path d="M0 40L50 4L100 40V80H0Z" class="house"/><path d="M8 34L46 7L72 25L34 52Z" class="panel"/><path d="M54 7L92 34L82 41L46 15Z" class="panel" opacity=".7"/><rect x="40" y="52" width="20" height="28" class="roof"/></g>`).join('')}</svg>`,
    4: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="104" width="240" height="36" class="water"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${8 + i * 30} 116q6-12 12 0" class="crop"/>`).join('')}<circle cx="210" cy="24" r="15" class="sun-c"/>${[0, 1, 2].map((i) => `<g transform="translate(${18 + i * 72} 40)"><path d="M0 16L52 0L56 8L4 24Z" class="panel"/><path d="M8 22V66M50 8V66" class="leg"/><path d="M20 66L26 26M40 66L36 22" class="up"/></g>`).join('')}</svg>`,
    5: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="124" width="240" height="16" class="ground"/><circle cx="214" cy="24" r="14" class="sun-c"/><rect x="60" y="14" width="78" height="110" class="tower"/>${[0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2].map((c) => `<rect x="${66 + c * 24}" y="${20 + r * 14}" width="20" height="11" class="cellpane" opacity="${0.55 + ((r + c) % 3) * 0.2}"/>`).join('')).join('')}<path d="M138 70H196V124H138Z" class="tower"/><path d="M140 70L168 50L196 70Z" class="glasspane"/>${[0, 1].map((c) => `<rect x="${146 + c * 24}" y="80" width="18" height="34" class="cellpane" opacity=".75"/>`).join('')}</svg>`,
  };

  const dia = $('#pv-dia');
  const list = $('#pv-steps');
  let cur = null;   // the step picked (clicked); hovering only previews while nothing is picked

  function light(k) {
    if (!dia) return;
    dia.classList.toggle('focus', !!k);
    dia.querySelectorAll('[data-s]').forEach((e) => e.classList.toggle('on', e.dataset.s === k));
  }
  function pick(k) {
    cur = k;
    light(k);
    list.querySelectorAll('button[data-k]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
  }

  function render(d) {
    if (!list || !d) return;
    const L = d.labels;
    list.setAttribute('aria-label', L.steps_label);
    list.innerHTML = d.steps.map((s, i) => `<li><button type="button" data-k="${i + 1}" aria-pressed="${cur === String(i + 1)}">
      <b><i>${i + 1}</i>${esc(s.title)}</b><p>${esc(s.text)}</p><span class="pv-part">${esc(s.part)}</span></button></li>`).join('');
    const pct = new Intl.NumberFormat(d.lang, { style: 'percent', maximumFractionDigits: 1 });
    const last = d.gens.length;
    $('#pv-gens').innerHTML = d.gens.map((g, i) => {
      const n = i + 1;
      const lightCell = typeof g.light === 'number'
        ? `≈ ${esc(pct.format(g.light / 100))}<span class="pv-bar" aria-hidden="true"><span style="width:${Math.max(4, Math.min(100, (g.light - 85) * 10))}%"></span></span>`
        : esc(L.light_by_design);
      return `<article class="pv-gen${n === last ? ' pv-gen-now' : ''}">${ILLO[n] || ''}<div class="pv-gen-in">
        <span class="pv-era">${esc(L.gen_label.replace('{n}', n))} · ${esc(g.era)}</span><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p>
        <dl><dt>${esc(L.lbl_glass)}</dt><dd>${esc(g.glass)}</dd><dt>${esc(L.lbl_light)}</dt><dd>${lightCell}</dd>
        <dt>${esc(L.lbl_used)}</dt><dd>${esc(g.where)}</dd><dt>${esc(L.lbl_buyers)}</dt><dd>${esc(g.who)}</dd></dl></div></article>`;
    }).join('');
  }

  if (list) {
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]');
      if (b) pick(cur === b.dataset.k ? null : b.dataset.k);
    });
    list.addEventListener('mouseover', (e) => {
      const b = e.target.closest('button[data-k]');
      if (b && !cur) light(b.dataset.k);
    });
    list.addEventListener('mouseleave', () => { if (!cur) light(null); });
  }
  document.addEventListener('sit:pvglass', (e) => render(e.detail));
  if (window.__sitPv) render(window.__sitPv);
})();
