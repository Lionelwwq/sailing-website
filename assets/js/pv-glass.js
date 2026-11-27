/* How PV glass works (pv-glass.html)
   - banner: the three numbers count up
   - the six steps play on their own while the diagram is on screen (progress line under the step); clicking a step,
     a part of the diagram or the arrows stops on that step; the play button starts it again
   - the five generations: a timeline of tabs, one generation at a time (photo or drawing, details, light chart)
   Texts come from content/pages/pv-glass.json through site.js (event "sit:pvglass", in the current language). */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP_MS = 5200;
  const ARROW = { prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' };

  // a drawing for each generation (shown until a photo is added): where the panels went
  const ILLO = {
    1: '<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="110" width="240" height="30" class="ground"/><circle cx="200" cy="30" r="16" class="sun-c"/><path d="M60 110V72L100 48L140 72V110Z" class="house"/><path d="M104 52L134 70L126 75L96 57Z" class="panel"/><rect x="88" y="86" width="16" height="24" class="roof"/></svg>',
    2: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="70" width="240" height="70" class="ground"/><circle cx="205" cy="28" r="16" class="sun-c"/>${[0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5].map((c) => `<g transform="translate(${10 + c * 38 + r * 6} ${74 + r * 20})"><path d="M0 10L30 0L34 8L4 18Z" class="panel"/><path d="M4 18V24M30 8V16" class="leg"/></g>`).join('')).join('')}</svg>`,
    3: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="112" width="240" height="28" class="ground"/><circle cx="210" cy="26" r="15" class="sun-c"/>${[[20, 1], [120, 0.85]].map(([x, s]) => `<g transform="translate(${x} ${112 - 80 * s}) scale(${s})"><path d="M0 40L50 4L100 40V80H0Z" class="house"/><path d="M8 34L46 7L72 25L34 52Z" class="panel"/><path d="M54 7L92 34L82 41L46 15Z" class="panel" opacity=".7"/><rect x="40" y="52" width="20" height="28" class="roof"/></g>`).join('')}</svg>`,
    4: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="104" width="240" height="36" class="water"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${8 + i * 30} 116q6-12 12 0" class="crop"/>`).join('')}<circle cx="210" cy="24" r="15" class="sun-c"/>${[0, 1, 2].map((i) => `<g transform="translate(${18 + i * 72} 40)"><path d="M0 16L52 0L56 8L4 24Z" class="panel"/><path d="M8 22V66M50 8V66" class="leg"/><path d="M20 66L26 26M40 66L36 22" class="up"/></g>`).join('')}</svg>`,
    5: `<svg viewBox="0 0 240 140" aria-hidden="true"><rect y="124" width="240" height="16" class="ground"/><circle cx="214" cy="24" r="14" class="sun-c"/><rect x="60" y="14" width="78" height="110" class="tower"/>${[0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2].map((c) => `<rect x="${66 + c * 24}" y="${20 + r * 14}" width="20" height="11" class="cellpane" opacity="${0.55 + ((r + c) % 3) * 0.2}"/>`).join('')).join('')}<path d="M138 70H196V124H138Z" class="tower"/><path d="M140 70L168 50L196 70Z" class="glasspane"/>${[0, 1].map((c) => `<rect x="${146 + c * 24}" y="80" width="18" height="34" class="cellpane" opacity=".75"/>`).join('')}</svg>`,
  };

  const dia = $('#pv-dia');
  const stage = $('#pv-stage');
  const stepsEl = $('#pv-steps');
  const panel = $('#pv-panel');
  const body = $('#pv-panel-body');
  const playBtn = $('#pv-play');
  const rail = $('#pv-rail');
  const view = $('#pv-gen-view');
  if (!dia || !stepsEl || !rail) return;

  let T = null;          // the texts, in the current language
  let lang = 'en';
  let step = 1;
  let gen = 1;
  let playing = false;
  let userStopped = false;   // the visitor paused or picked a step: no more autoplay until they press play
  let inView = false;
  let timer = null;
  let counted = false;
  const nf = (o) => new Intl.NumberFormat(lang, o);
  const pct = (v, digits = 1) => nf({ style: 'percent', maximumFractionDigits: digits }).format(v / 100);

  /* ---------- banner numbers ---------- */
  function statText(s, v) {
    if (s.unit === 'percent') return nf({ style: 'percent', minimumFractionDigits: Number.isInteger(s.value) ? 0 : 1, maximumFractionDigits: 1 }).format(v / 100);
    return `${nf().format(Math.round(v))}${s.unit === 'plus' ? '+' : ''}`;
  }
  function renderStats() {
    const box = $('#pv-stats');
    if (!box || !T.stats) return;
    box.innerHTML = T.stats.map((s, i) => `<div class="pv-stat"><b data-i="${i}">${esc(statText(s, s.value))}</b><span>${esc(s.label)}</span></div>`).join('');
    if (counted || reduce) return;
    counted = true;
    const t0 = performance.now();
    const run = (now) => {
      const k = Math.min(1, (now - t0) / 1600);
      const e = 1 - Math.pow(1 - k, 3);
      $$('b[data-i]', box).forEach((b) => { const s = T.stats[b.dataset.i]; b.textContent = statText(s, s.value * e); });
      if (k < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  /* ---------- the six steps ---------- */
  function renderSteps() {
    stepsEl.setAttribute('aria-label', T.steps_label);
    stepsEl.innerHTML = T.steps.map((s, i) => `<li><button type="button" class="pv-step" data-k="${i + 1}" aria-pressed="false">
      <span class="pv-step-n">${i + 1}</span><span class="pv-step-t">${esc(s.title)}</span><span class="pv-prog" aria-hidden="true"><span></span></span></button></li>`).join('');
    $('#pv-prev').setAttribute('aria-label', T.tour_prev);
    $('#pv-next').setAttribute('aria-label', T.tour_next);
    showStep(step, false);
    setPlaying(playing);
  }
  function showStep(k, animate = true) {
    step = k;
    const s = T.steps[k - 1];
    dia.classList.add('focus');
    $$('[data-s]', dia).forEach((e) => e.classList.toggle('on', e.dataset.s === String(k)));
    $$('.pv-step', stepsEl).forEach((b) => {
      const on = b.dataset.k === String(k);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('#pv-count').textContent = T.step_of.replace('{n}', k).replace('{total}', T.steps.length);
    body.innerHTML = `<h3><i>${k}</i><span>${esc(s.title)}</span></h3><p>${esc(s.text)}</p><span class="pv-part">${esc(s.part)}</span>`;
    if (animate && !reduce) { body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap'); }
    restartProgress();
  }
  function restartProgress() {
    $$('.pv-prog span', stepsEl).forEach((p) => { p.style.animation = 'none'; });
    if (!playing) return;
    const p = $(`.pv-step[data-k="${step}"] .pv-prog span`, stepsEl);
    if (p) { void p.getBoundingClientRect(); p.style.animation = `pv-progress ${STEP_MS}ms linear forwards`; }
  }
  function tick() {
    clearTimeout(timer);
    timer = setTimeout(() => { showStep((step % T.steps.length) + 1); tick(); }, STEP_MS);
  }
  function setPlaying(on) {
    playing = !!on && !reduce;
    stage.classList.toggle('playing', playing);
    playBtn.setAttribute('aria-pressed', String(playing));
    playBtn.setAttribute('aria-label', playing ? T.tour_pause : T.tour_play);
    playBtn.title = playing ? T.tour_pause : T.tour_play;
    panel.setAttribute('aria-live', playing ? 'off' : 'polite');   // no announcements every five seconds while it plays
    clearTimeout(timer);
    if (playing) tick();
    restartProgress();
  }
  function pick(k) {
    userStopped = true;
    setPlaying(false);
    showStep(((k - 1 + T.steps.length) % T.steps.length) + 1);
  }

  stepsEl.addEventListener('click', (e) => { const b = e.target.closest('.pv-step'); if (b) pick(Number(b.dataset.k)); });
  stepsEl.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d || !e.target.closest('.pv-step')) return;
    e.preventDefault();
    pick(step + d);
    $(`.pv-step[data-k="${step}"]`, stepsEl).focus();
  });
  dia.addEventListener('click', (e) => { const g = e.target.closest('[data-s]'); if (g) pick(Number(g.dataset.s)); });
  $('#pv-prev').addEventListener('click', () => pick(step - 1));
  $('#pv-next').addEventListener('click', () => pick(step + 1));
  playBtn.addEventListener('click', () => {
    if (playing) { userStopped = true; setPlaying(false); }
    else { userStopped = false; showStep((step % T.steps.length) + 1); setPlaying(true); }
  });
  // play while the diagram is on screen and the tab is visible
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => {
      inView = en[0].isIntersecting;
      if (!T) return;
      if (inView && !userStopped && !playing) setPlaying(true);
      if (!inView && playing) setPlaying(false);
    }, { threshold: 0.35 }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => {
    if (!T) return;
    if (document.hidden && playing) setPlaying(false);
    else if (!document.hidden && inView && !userStopped) setPlaying(true);
  });

  /* ---------- the five generations ---------- */
  function renderRail() {
    rail.setAttribute('aria-label', T.gens_title);
    rail.innerHTML = `<span class="pv-rail-line" aria-hidden="true"><span></span></span>${T.gens.map((g, i) => `<button type="button" role="tab" class="pv-tab" id="pv-tab-${i + 1}" data-g="${i + 1}" aria-controls="pv-gen-view" aria-selected="false" tabindex="-1">
      <span class="pv-tab-n">${String(i + 1).padStart(2, '0')}</span><span class="pv-tab-era">${esc(g.era)}</span><span class="pv-tab-t">${esc(g.title)}</span></button>`).join('')}`;
    showGen(gen, false);
  }
  function bars() {
    const lo = 85;
    const hi = 95;
    return T.gens.map((g, i) => {
      const v = typeof g.light === 'number' ? g.light : null;
      const h = v == null ? 100 : Math.max(6, Math.min(100, ((v - lo) / (hi - lo)) * 100));
      const label = v == null ? `${nf().format(10)}–${pct(80, 0)}` : pct(v);
      return `<button type="button" class="pv-bar${i + 1 === gen ? ' on' : ''}${v == null ? ' design' : ''}" data-g="${i + 1}" style="--h:${h}%;--i:${i}" aria-label="${esc(T.gen_label.replace('{n}', i + 1))}: ${esc(label)}">
        <span class="pv-bar-v">${esc(label)}</span><span class="pv-bar-track"><span class="pv-bar-b"></span></span><span class="pv-bar-n">${i + 1}</span></button>`;
    }).join('');
  }
  function showGen(n, animate = true) {
    const total = T.gens.length;
    gen = Math.max(1, Math.min(total, n));
    const g = T.gens[gen - 1];
    $$('.pv-tab', rail).forEach((b) => {
      const k = Number(b.dataset.g);
      b.classList.toggle('on', k === gen);
      b.classList.toggle('past', k < gen);
      b.setAttribute('aria-selected', String(k === gen));
      b.tabIndex = k === gen ? 0 : -1;
    });
    rail.style.setProperty('--pv-fill', `${(gen / total) * 100}%`);
    view.setAttribute('aria-labelledby', `pv-tab-${gen}`);
    const light = typeof g.light === 'number' ? `≈ ${pct(g.light)}` : T.light_by_design;
    view.innerHTML = `
      <div class="pv-gv-media">${g.photo ? `<img src="${esc(g.photo)}" alt="" loading="lazy">` : ILLO[gen] || ''}
        <span class="pv-gv-badge">${esc(T.gen_label.replace('{n}', gen))}</span>
        <div class="pv-gv-nav">
          <button type="button" class="pv-icon" data-go="-1" aria-label="${esc(T.gen_prev)}"${gen === 1 ? ' disabled' : ''}>${ARROW.prev}</button>
          <button type="button" class="pv-icon" data-go="1" aria-label="${esc(T.gen_next)}"${gen === total ? ' disabled' : ''}>${ARROW.next}</button>
        </div>
      </div>
      <div class="pv-gv-info">
        <span class="pv-era">${esc(g.era)}</span>
        <h3>${esc(g.title)}</h3>
        <p>${esc(g.text)}</p>
        <dl><dt>${esc(T.lbl_glass)}</dt><dd>${esc(g.glass)}</dd><dt>${esc(T.lbl_light)}</dt><dd>${esc(light)}</dd>
          <dt>${esc(T.lbl_used)}</dt><dd>${esc(g.where)}</dd><dt>${esc(T.lbl_buyers)}</dt><dd>${esc(g.who)}</dd></dl>
        <figure class="pv-chart"><figcaption>${esc(T.chart_title)}</figcaption><div class="pv-bars">${bars()}</div></figure>
      </div>`;
    view.classList.toggle('still', !animate || reduce);
    if (animate && !reduce) { view.classList.remove('swap'); void view.offsetWidth; view.classList.add('swap'); }
  }
  rail.addEventListener('click', (e) => { const b = e.target.closest('.pv-tab'); if (b) showGen(Number(b.dataset.g)); });
  rail.addEventListener('keydown', (e) => {
    const total = T.gens.length;
    const to = { ArrowRight: gen + 1, ArrowLeft: gen - 1, Home: 1, End: total }[e.key];
    if (!to || !e.target.closest('.pv-tab')) return;
    e.preventDefault();
    showGen(to);
    $(`.pv-tab[data-g="${gen}"]`, rail).focus();
  });
  view.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { showGen(gen + Number(go.dataset.go)); return; }
    const bar = e.target.closest('.pv-bar');
    if (bar) showGen(Number(bar.dataset.g));
  });
  // swipe the picture sideways on a phone to change generation
  let sx = null;
  view.addEventListener('pointerdown', (e) => { if (e.target.closest('.pv-gv-media')) sx = e.clientX; });
  view.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) showGen(gen + (dx < 0 ? 1 : -1));
  });

  /* ---------- texts arrive (and again when the language changes) ---------- */
  function render(d) {
    if (!d || !d.text) return;
    T = d.text;
    lang = d.lang || 'en';
    renderStats();
    renderSteps();
    renderRail();
    if (inView && !userStopped && !playing) setPlaying(true);
  }
  document.addEventListener('sit:pvglass', (e) => render(e.detail));
  if (window.__sitPv) render(window.__sitPv);
})();
