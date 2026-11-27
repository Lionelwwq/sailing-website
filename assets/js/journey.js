/* About: "Our milestones" (about.html, section #journey)
   - computers: the section stays on screen while the visitor scrolls through it; each stretch of scrolling (or a click on
     a year, or the arrows) sails the boat along the gold route to the next stop, lights the stop and fades in its story
   - the 2027 plan is kept apart: it sits past the end of the route by a lighthouse, on a dotted line, marked "Planned";
     the boat stays at 2026 (it has not got there yet) and the lighthouse lights up instead
   - phones and short screens: a vertical timeline; the boat moves down the line to the stop in the middle of the screen
   Texts come from content/pages/about.json through site.js (event "sit:about", in the current language). */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 760px), (max-height: 540px)');

  const sec = $('#journey');
  if (!sec) return;
  const track = $('#jr-track', sec);
  const scene = $('#jr-scene', sec);
  const years = $('#jr-years', sec);
  const stopsBox = $('#jr-stops', sec);
  const card = $('#jr-card', sec);
  const boat = $('#jr-boat', sec);
  const list = $('#jr-list', sec);
  const routeDim = $('#jr-route-dim', sec);
  const routeOn = $('#jr-route-on', sec);
  const routePlan = $('#jr-route-plan', sec);

  // the stops on the 1200 x 400 scene: six milestones along the route, then the lighthouse (the plan) on its own
  const PTS = [[95, 262], [275, 226], [455, 266], [635, 218], [815, 258], [990, 222]];
  const LIGHT = [1112, 238];
  const W = 1200, H = 400;

  let T = null;
  let idx = 0;          // the stop shown (0-5 milestones, 6 the plan)
  let frac = 0;         // the boat's place along the route, 0-1
  let anim = 0;
  let stopFrac = [];
  let len = 0;

  /* ---------- the route: a smooth curve through the stops ---------- */
  function curve(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  function buildRoute() {
    const d = curve(PTS);
    routeDim.setAttribute('d', d);
    routeOn.setAttribute('d', d);
    const last = PTS[PTS.length - 1];
    routePlan.setAttribute('d', `M${last[0]} ${last[1]} C${last[0] + 40} ${last[1] - 6} ${LIGHT[0] - 50} ${LIGHT[1] + 14} ${LIGHT[0] - 18} ${LIGHT[1] + 6}`);
    len = routeOn.getTotalLength();
    // where each stop lies along the route (searched, since the curve is not even)
    stopFrac = PTS.map(([x, y]) => {
      let best = 0, bestD = Infinity;
      for (let s = 0; s <= 400; s++) {
        const p = routeOn.getPointAtLength((s / 400) * len);
        const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (dd < bestD) { bestD = dd; best = s / 400; }
      }
      return best;
    });
  }

  function place(f) {
    frac = f;
    const p = routeOn.getPointAtLength(f * len);
    const q = routeOn.getPointAtLength(Math.min(len, f * len + 6));
    const tilt = Math.max(-9, Math.min(9, Math.atan2(q.y - p.y, q.x - p.x) * 57.3 * 0.6));
    boat.style.left = `${(p.x / W) * 100}%`;
    boat.style.top = `${(p.y / H) * 100}%`;
    boat.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
    routeOn.style.strokeDasharray = `${f * len} ${len}`;
  }

  function sail(to) {
    cancelAnimationFrame(anim);
    const from = frac;
    if (reduce || Math.abs(to - from) < 0.001) { place(to); return; }
    const dur = Math.min(1700, 650 + Math.abs(to - from) * 2600);
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      place(from + (to - from) * ease(t));
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  /* ---------- texts ---------- */
  const items = () => (T ? [...T.milestones, { ...T.vision, plan: true }] : []);

  function cardHtml(m) {
    if (m.plan) {
      return `<span class="yr">${esc(m.year)}</span><div><span class="jr-label">${esc(m.label)} <span class="jr-tag">${esc(T.journey_planned)}</span></span>
        <h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><p class="jr-note">${esc(m.note)}</p></div>`;
    }
    return `<span class="yr">${esc(m.year)}</span><div><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></div>`;
  }

  function render(detail) {
    T = detail.text;
    const all = items();
    years.innerHTML = all.map((m, i) => `<button type="button" role="tab" data-i="${i}" class="${m.plan ? 'plan' : ''}" aria-selected="false" tabindex="-1">
      <strong>${esc(m.year)}</strong><span>${esc(m.plan ? m.label : m.title)}</span></button>`).join('');
    stopsBox.innerHTML = T.milestones.map((m, i) => `<button type="button" class="jr-stop" data-i="${i}" style="left:${(PTS[i][0] / W) * 100}%;top:${(PTS[i][1] / H) * 100}%"
      aria-label="${esc(`${m.year} ${m.title}`)}" tabindex="-1"><i></i><span>${esc(m.year)}</span></button>`).join('')
      + `<span class="jr-light-tag" style="left:${(LIGHT[0] / W) * 100}%">${esc(T.vision.year)} · ${esc(T.journey_planned)}</span>`;
    $('#jr-prev', sec).setAttribute('aria-label', T.journey_prev);
    $('#jr-next', sec).setAttribute('aria-label', T.journey_next);
    list.innerHTML = all.map((m, i) => `<li class="jr-item${m.plan ? ' plan' : ''}" data-i="${i}">
        <b class="yr">${esc(m.year)}${m.plan ? ` <span class="jr-tag">${esc(T.journey_planned)}</span>` : ''}</b>
        <h3>${esc(m.title)}</h3><p>${esc(m.text)}</p>${m.plan ? `<p class="jr-note">${esc(m.note)}</p>` : ''}</li>`).join('')
      + '<li class="jr-pboat" aria-hidden="true"></li>';
    $('.jr-pboat', list).innerHTML = boat.innerHTML;
    show(idx, true);
  }

  /* ---------- one stop ---------- */
  function show(i, now) {
    const all = items();
    if (!all.length) return;
    i = Math.max(0, Math.min(all.length - 1, i));
    const changed = i !== idx || now;
    idx = i;
    const plan = !!all[i].plan;
    $$('button', years).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    $$('.jr-stop', stopsBox).forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('reached', j <= Math.min(i, 5)); });
    scene.classList.toggle('plan', plan);
    if (changed) {
      if (now || reduce) card.innerHTML = cardHtml(all[i]);
      else {
        card.classList.add('out');
        clearTimeout(card._t);
        card._t = setTimeout(() => { card.innerHTML = cardHtml(all[i]); card.classList.toggle('plan', plan); card.classList.remove('out'); }, 220);
      }
      card.classList.toggle('plan', plan);
      const to = stopFrac[Math.min(i, PTS.length - 1)];
      if (now) place(to); else sail(to);
    }
    // phones
    $$('.jr-item', list).forEach((li, j) => { li.classList.toggle('on', j === i); li.classList.toggle('reached', j < i && j < 6); });
    movePhoneBoat();
  }

  /* ---------- computers: scrolling through the section picks the stop ---------- */
  const count = () => items().length || 7;
  function range() { return track.offsetHeight - $('.jr-stage', track).offsetHeight; }
  function headerH() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 84; }
  function fromScroll() {
    if (small.matches || !T) return;
    const r = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(0.9999, (headerH() - r.top) / Math.max(1, range())));
    const i = Math.floor(p * count());
    if (i !== idx) show(i);
  }
  function goTo(i) {
    i = Math.max(0, Math.min(count() - 1, i));
    if (small.matches) {
      const li = $$('.jr-item', list)[i];
      if (li) li.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      show(i);
      return;
    }
    const top = window.scrollY + track.getBoundingClientRect().top - headerH() + ((i + 0.5) / count()) * range();
    show(i);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- phones: the stop in the middle of the screen ---------- */
  function fromPhoneScroll() {
    if (!small.matches || !T) return;
    const lis = $$('.jr-item', list);
    const mid = window.innerHeight * 0.58;
    let i = 0;
    lis.forEach((li, j) => { if (li.getBoundingClientRect().top < mid) i = j; });
    if (i !== idx) show(i);
  }
  function movePhoneBoat() {
    const lis = $$('.jr-item', list);
    const pb = $('.jr-pboat', list);
    if (!lis.length || !pb) return;
    const target = lis[Math.min(idx, 5)];
    const y = target.offsetTop;
    pb.style.transform = `translateY(${y - 18}px)`;
    list.style.setProperty('--on', `${Math.max(0, y)}px`);
    list.style.setProperty('--route', `${lis[Math.min(5, lis.length - 1)].offsetTop}px`);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; fromScroll(); fromPhoneScroll(); });
  }, { passive: true });
  window.addEventListener('resize', () => { movePhoneBoat(); fromScroll(); });
  small.addEventListener('change', () => { movePhoneBoat(); fromScroll(); fromPhoneScroll(); });

  years.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) goTo(+b.dataset.i); });
  years.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
    if (k == null) return;
    e.preventDefault();
    goTo(idx + k);
    requestAnimationFrame(() => { const b = $$('button', years)[idx]; if (b) b.focus({ preventScroll: true }); });
  });
  stopsBox.addEventListener('click', (e) => { const b = e.target.closest('.jr-stop'); if (b) goTo(+b.dataset.i); });
  $('#jr-prev', sec).addEventListener('click', () => goTo(idx - 1));
  $('#jr-next', sec).addEventListener('click', () => goTo(idx + 1));

  buildRoute();
  place(0);
  document.addEventListener('sit:about', (e) => render(e.detail));
  if (window.__sitAbout) render(window.__sitAbout);
  requestAnimationFrame(() => { fromScroll(); fromPhoneScroll(); });
})();
