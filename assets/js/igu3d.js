/* Insulated glass (glass.html#insulated): the "3D" view and "Build your unit".
   - the 3D tile under the photos shows the unit in 3D (CSS 3D, no libraries): drag to turn it, pull the layers apart,
     labels on or off, slow rotation, reset
   - only while the 3D view is on, "Build your unit" shows beside it: common 1" build-ups or your own pair of glasses,
     air or argon, Low-E or not, a quantity; the model, the size line and the specifications follow the choice;
     "Add ... to quote list" puts that exact unit in the quote list (window.SIT_QUOTE from site.js)
   site.js calls SIT_IGU.mount(stage, info, texts, lang, product) when the 3D tile is chosen and SIT_IGU.unmount() after.
   Texts: "builder" in the insulated glass item of content/glass.json (in the current language). */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OVERALL = 25.4;                 // 1 inch: the usual overall thickness of a double-glazed unit
  const MIN_SPACER = 6;
  const GLASS = [3, 4, 5, 6, 8, 10];    // glass thicknesses offered (mm)
  const PRESETS = [['res', 3, 3], ['res', 4, 4], ['com', 6, 6]];
  const W = 210, H = 250, K = 3.3;      // the model's size on screen (px) and px per mm of thickness
  const VIEW = { rx: -14, ry: -38, ex: 0.42 };
  const ICON = {
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5 12 4l7 3.5-7 3.5Z"/><path d="M5 12l7 3.5 7-3.5"/><path d="M5 16.5 12 20l7-3.5"/></svg>',
    labels: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5V4h8.5l9 9-8.5 8.5Z"/><circle cx="8" cy="8.5" r="1.4"/></svg>',
    spin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.5 3.5V8H16"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M3.5 3.5V8H8"/></svg>',
  };

  // the choice stays while the visitor moves between photos and the 3D view
  const st = { outer: 6, inner: 6, argon: false, lowe: true, qty: 1, labels: true, spin: false, ...VIEW };
  let T = null, lang = 'en', product = null;
  let stage = null, info = null, model = null, labelsBox = null, raf = 0, drag = null;

  const nf = () => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const mm = (v) => nf().format(v);
  const spacer = () => Math.round((OVERALL - st.outer - st.inner) * 10) / 10;
  const build = () => `${mm(st.outer)} + ${mm(spacer())} + ${mm(st.inner)}`;
  const short = () => `${mm(st.outer)}+${mm(st.inner)}`;
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => ({ overall: `${mm(OVERALL)} mm (1″)`, qty: st.qty, build: short() }[k] ?? m));

  /* ---------- the model ---------- */
  function face(cls, w, h, tf) { return `<div class="f ${cls}" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf}"></div>`; }
  function box(cls, w, h, d, x, y, z) {
    return `<div class="b3 ${cls}" style="transform:translate3d(${x}px,${y}px,${z}px)">`
      + face('fr', w, h, `translateZ(${d / 2}px)`) + face('bk', w, h, `rotateY(180deg) translateZ(${d / 2}px)`)
      + face('sd', d, h, `rotateY(90deg) translateZ(${w / 2}px)`) + face('sd', d, h, `rotateY(-90deg) translateZ(${w / 2}px)`)
      + face('tp', w, d, `rotateX(90deg) translateZ(${h / 2}px)`) + face('tp', w, d, `rotateX(-90deg) translateZ(${h / 2}px)`) + '</div>';
  }
  // where things sit along the depth (z, px); the outside (outer glass) faces the viewer
  function layout() {
    const gap = st.ex * 64;
    const sp = spacer() * K;
    return {
      sp, gap,
      zOuter: sp / 2 + (st.outer * K) / 2 + gap,
      zInner: -(sp / 2 + (st.inner * K) / 2 + gap),
    };
  }
  function drawModel() {
    if (!model) return;
    const L = layout();
    const bar = 9;
    const s = L.sp;
    model.innerHTML = box('glass', W, H, st.outer * K, 0, 0, L.zOuter)
      + (st.lowe ? `<div class="f lowe" style="width:${W - 2}px;height:${H - 2}px;margin:${-(H - 2) / 2}px 0 0 ${-(W - 2) / 2}px;transform:translateZ(${L.zOuter - (st.outer * K) / 2 - 0.6}px)"></div>` : '')
      + (st.argon ? `<div class="f gas" style="width:${W - 2 * bar}px;height:${H - 2 * bar}px;margin:${-(H - 2 * bar) / 2}px 0 0 ${-(W - 2 * bar) / 2}px;transform:translateZ(0px)"></div>` : '')
      + box('spacer', W, bar, s, 0, -(H - bar) / 2, 0) + box('spacer', W, bar, s, 0, (H - bar) / 2, 0)
      + box('spacer', bar, H - 2 * bar, s, -(W - bar) / 2, 0, 0) + box('spacer', bar, H - 2 * bar, s, (W - bar) / 2, 0, 0)
      + box('glass', W, H, st.inner * K, 0, 0, L.zInner);
    place();
  }
  // the model grows or shrinks with the stage (phones have a smaller one); room is kept for the tools at the bottom
  function fit() {
    const v = model.parentElement;
    return Math.max(0.42, Math.min(1.1, v.clientWidth / 440, (v.clientHeight - 40) / 330));
  }
  function place() {
    if (!model) return;
    model.style.transform = `scale(${fit().toFixed(3)}) rotateX(${st.rx}deg) rotateY(${st.ry}deg)`;
    drawLabels();
  }
  // a point of the model on the screen (the same rotation and perspective as the CSS)
  function project(x, y, z) {
    const a = (st.ry * Math.PI) / 180, b = (st.rx * Math.PI) / 180;
    const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a);
    const y2 = y * Math.cos(b) - z1 * Math.sin(b), z2 = y * Math.sin(b) + z1 * Math.cos(b);
    const v = model.parentElement, s = fit();
    const P = 1100, k = P / (P - z2 * s);
    return [v.offsetLeft + v.clientWidth / 2 + x1 * s * k, v.offsetTop + v.clientHeight / 2 + y2 * s * k];
  }
  function drawLabels() {
    if (!labelsBox) return;
    labelsBox.hidden = !st.labels;
    if (!st.labels) return;
    const L = layout();
    const mmTxt = (v) => `${mm(v)} mm`;
    const parts = [
      [T.outer_pane, mmTxt(st.outer), [W / 2, -H / 2 + 30, L.zOuter], 'r'],
      [T.spacer_part, mmTxt(spacer()), [W / 2, H / 2 - 5, 0], 'r'],
      [T.inner_pane, mmTxt(st.inner), [-W / 2, H / 2 - 40, L.zInner], 'l'],
      [st.argon ? T.argon : T.air, T.cavity, [-W / 2 + 12, -H / 2 + 40, 0], 'l'],
    ];
    if (st.lowe) parts.push([T.lowe, T.surface2, [W / 2, -H / 2 + 90, L.zOuter - (st.outer * K) / 2], 'r']);
    labelsBox.innerHTML = parts.map(([name, val, p, side]) => {
      const [x, y] = project(...p);
      return `<span class="igu-lbl ${side}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"><i></i><b>${esc(name)}</b> ${esc(val)}</span>`;
    }).join('');
    // keep every label inside the stage
    const box = stage.getBoundingClientRect();
    labelsBox.querySelectorAll('.igu-lbl').forEach((el) => {
      const r = el.getBoundingClientRect();
      let dx = 0;
      if (r.right > box.right - 6) dx = box.right - 6 - r.right;
      if (r.left + dx < box.left + 6) dx = box.left + 6 - r.left;
      if (dx) el.style.marginLeft = `${dx.toFixed(1)}px`;
    });
  }
  function spinLoop() {
    cancelAnimationFrame(raf);
    if (!st.spin || reduce || !model) return;
    let last = performance.now();
    const step = (now) => {
      st.ry += (now - last) * 0.018;
      last = now;
      if (st.ry > 180) st.ry -= 360;
      place();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---------- the stage: model, size line, tools ---------- */
  function stageHtml() {
    return `<div class="igu-pill" aria-live="polite"></div>
      <div class="igu-view"><div class="igu-model"></div></div>
      <div class="igu-labels" aria-hidden="true"></div>
      <div class="igu-tools">
        <label class="igu-sep" title="${esc(T.separate)}">${ICON.layers}<input type="range" min="0" max="100" value="${Math.round(st.ex * 100)}" data-igu="ex" aria-label="${esc(T.separate)}"></label>
        <button type="button" data-igu="labels" aria-pressed="${st.labels}" title="${esc(T.labels)}">${ICON.labels}<span>${esc(T.labels)}</span></button>
        <button type="button" data-igu="spin" aria-pressed="${st.spin}" title="${esc(T.rotate)}">${ICON.spin}<span>${esc(T.rotate)}</span></button>
        <button type="button" data-igu="reset" title="${esc(T.reset)}">${ICON.reset}<span>${esc(T.reset)}</span></button>
      </div>`;
  }
  function pill() {
    const p = stage && stage.querySelector('.igu-pill');
    if (p) p.innerHTML = `<b>${mm(st.outer)}</b> + ${mm(spacer())} ${esc(T.spacer)} + <b>${mm(st.inner)}</b> = ${mm(OVERALL)} mm`;
  }

  /* ---------- "Build your unit" ---------- */
  const presetName = (p) => (p[0] === 'res' ? T.residential : T.commercial);
  function opts(list, val) { return list.map((v) => `<option value="${v}"${v === val ? ' selected' : ''}>${mm(v)} mm</option>`).join(''); }
  const fits = (o, i) => OVERALL - o - i >= MIN_SPACER;
  function builderHtml() {
    const seg = (key, a, b, on) => `<div class="igu-seg" role="group" aria-label="${esc(T[key])}">
      <button type="button" data-igu="${key}" data-v="0" aria-pressed="${!on}">${esc(a)}</button><button type="button" data-igu="${key}" data-v="1" aria-pressed="${on}">${esc(b)}</button></div>`;
    return `<div class="igu-build">
      <span class="igu-h">${esc(T.title)}</span>
      <span class="igu-sub">${esc(fill(T.common))}</span>
      <div class="igu-presets">${PRESETS.map((p, i) => `<button type="button" data-igu="preset" data-i="${i}" aria-pressed="${st.outer === p[1] && st.inner === p[2]}">
        <b>${esc(presetName(p))}</b><small>${mm(p[1])} + ${mm(p[2])} mm</small></button>`).join('')}</div>
      <span class="igu-sub">${esc(T.own)}</span>
      <div class="igu-pair">
        <label><span>${esc(T.outer)}</span><select data-igu="outer">${opts(GLASS.filter((v) => fits(v, 3)), st.outer)}</select></label>
        <span aria-hidden="true">+</span>
        <label><span>${esc(T.inner)}</span><select data-igu="inner">${opts(GLASS.filter((v) => fits(st.outer, v)), st.inner)}</select></label>
      </div>
      <div class="igu-two">
        <div><span class="igu-sub">${esc(T.fill)}</span>${seg('argon', T.air, T.argon, st.argon)}</div>
        <div><span class="igu-sub">${esc(T.lowe)}</span>${seg('lowe', T.no, T.yes, st.lowe)}</div>
      </div>
      <div class="igu-yours"><span>${esc(T.yours)}</span><b>${build()} = ${mm(OVERALL)} mm (1″)</b></div>
      <div class="igu-add">
        <div class="igu-qty"><button type="button" data-igu="qty" data-v="-1" aria-label="−1">−</button><input type="number" min="1" max="9999" value="${st.qty}" data-igu="qtyin" aria-label="${esc(T.qty)}"><button type="button" data-igu="qty" data-v="1" aria-label="+1">+</button></div>
        <button type="button" class="btn btn-brand" data-igu="add">${esc(fill(T.add))}</button>
      </div>
    </div>`;
  }
  // the chosen unit, at the top of the specifications
  function specRows() {
    const table = info && info.querySelector('.spec-table tbody');
    if (!table) return;
    table.querySelectorAll('tr.sel').forEach((r) => r.remove());
    const tag = `<span class="igu-tag">${esc(T.sel)}</span>`;
    const rows = [
      [T.yours, `${mm(st.outer)} mm + ${mm(spacer())} mm ${esc(T.spacer)} + ${mm(st.inner)} mm ${tag}`],
      [T.overall_label, `${mm(OVERALL)} mm (1″)`],
      [T.fill, `${esc(st.argon ? T.argon : T.air)} ${tag}`],
      [T.lowe, `${esc(st.lowe ? `${T.yes} · ${T.surface2}` : T.no)} ${tag}`],
    ];
    table.insertAdjacentHTML('afterbegin', rows.map(([a, b]) => `<tr class="sel"><th scope="row">${esc(a)}</th><td>${b}</td></tr>`).join(''));
  }
  function quoteItem() {
    const key = `glass:insulated:${st.outer}-${st.inner}-${st.argon ? 'argon' : 'air'}-${st.lowe ? 'lowe' : 'clear'}`;
    const name = {};
    Object.entries(T.all || {}).forEach(([l, tx]) => {
      const f = (v) => new Intl.NumberFormat(l, { maximumFractionDigits: 1 }).format(v);
      name[l] = `${st.qty} × ${tx.quote_name.replace('{build}', `${f(st.outer)} + ${f(spacer())} + ${f(st.inner)}`)
        .replace('{fill}', st.argon ? tx.argon : tx.air).replace('{lowe}', st.lowe ? ', Low-E' : '')}`;
    });
    return { key, kind: 'glass', id: 'insulated', name, photo: product && product.photo };
  }
  function refresh(rebuild) {
    if (st.inner > 25.4 - MIN_SPACER - st.outer) st.inner = Math.max(...GLASS.filter((v) => fits(st.outer, v)));
    const b = info && info.querySelector('.igu-build');
    if (b && rebuild) b.outerHTML = builderHtml();
    else if (b) {
      b.querySelectorAll('[data-igu="preset"]').forEach((x) => { const p = PRESETS[+x.dataset.i]; x.setAttribute('aria-pressed', String(st.outer === p[1] && st.inner === p[2])); });
      b.querySelector('.igu-yours b').textContent = `${build()} = ${mm(OVERALL)} mm (1″)`;
      b.querySelector('[data-igu="add"]').textContent = fill(T.add);
    }
    pill();
    specRows();
    drawModel();
  }

  /* ---------- events ---------- */
  function onClick(e) {
    const b = e.target.closest('[data-igu]');
    if (!b) return;
    const k = b.dataset.igu;
    if (k === 'labels') { st.labels = !st.labels; b.setAttribute('aria-pressed', String(st.labels)); drawLabels(); return; }
    if (k === 'spin') { st.spin = !st.spin; b.setAttribute('aria-pressed', String(st.spin)); spinLoop(); return; }
    if (k === 'reset') {
      Object.assign(st, VIEW, { spin: false });
      const sp = stage.querySelector('[data-igu="spin"]'); if (sp) sp.setAttribute('aria-pressed', 'false');
      const r = stage.querySelector('[data-igu="ex"]'); if (r) r.value = Math.round(st.ex * 100);
      spinLoop(); drawModel(); return;
    }
    if (k === 'preset') { const p = PRESETS[+b.dataset.i]; st.outer = p[1]; st.inner = p[2]; refresh(true); return; }
    if (k === 'argon' || k === 'lowe') {
      st[k] = b.dataset.v === '1';
      b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      refresh(false); return;
    }
    if (k === 'qty') { st.qty = Math.max(1, Math.min(9999, st.qty + Number(b.dataset.v))); const q = info.querySelector('[data-igu="qtyin"]'); if (q) q.value = st.qty; refresh(false); return; }
    if (k === 'add' && window.SIT_QUOTE) window.SIT_QUOTE.put(quoteItem());
  }
  function onChange(e) {
    const k = e.target.dataset.igu;
    if (k === 'outer' || k === 'inner') { st[k] = Number(e.target.value); refresh(true); }
    if (k === 'qtyin') { st.qty = Math.max(1, Math.min(9999, Math.round(Number(e.target.value) || 1))); e.target.value = st.qty; refresh(false); }
  }
  function onInput(e) {
    if (e.target.dataset.igu === 'ex') { st.ex = Number(e.target.value) / 100; drawModel(); }
  }
  function onDown(e) {
    if (e.target.closest('.igu-tools')) return;
    drag = { x: e.clientX, y: e.clientY, rx: st.rx, ry: st.ry, id: e.pointerId };
    stage.classList.add('dragging');
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3 && !stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
    st.ry = drag.ry + dx * 0.45;
    st.rx = Math.max(-40, Math.min(40, drag.rx - dy * 0.3));
    place();
  }
  function onUp() { drag = null; if (stage) stage.classList.remove('dragging'); }
  function onResize() { drawLabels(); }

  /* ---------- mount / unmount ---------- */
  function mount(stageEl, infoEl, texts, language, item) {
    unmount();
    T = texts; lang = language || 'en'; product = item;
    stage = stageEl; info = infoEl;
    stage.innerHTML = stageHtml();
    model = stage.querySelector('.igu-model');
    labelsBox = stage.querySelector('.igu-labels');
    const short = info.querySelector('.ex-short');
    if (short) short.insertAdjacentHTML('afterend', builderHtml());
    stage.addEventListener('click', onClick);
    stage.addEventListener('input', onInput);
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    info.addEventListener('click', onClick);
    info.addEventListener('change', onChange);
    window.addEventListener('resize', onResize);
    refresh(false);
    spinLoop();
  }
  function unmount() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    if (stage) ['click', 'input', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((ev) => stage.removeEventListener(ev, { click: onClick, input: onInput, pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp }[ev]));
    if (info) {
      info.removeEventListener('click', onClick);
      info.removeEventListener('change', onChange);
      if (document.contains(info)) {
        const b = info.querySelector('.igu-build'); if (b) b.remove();
        info.querySelectorAll('.spec-table tr.sel').forEach((r) => r.remove());
      }
    }
    stage = info = model = labelsBox = null;
  }

  // the small cube on the 3D tile
  const thumb = '<svg class="igu-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 7.2v9.6l-8 4.4-8-4.4V7.2Z M4 7.2l8 4.4 8-4.4 M12 11.6v9.6"/></svg>';

  window.SIT_IGU = { mount, unmount, thumb };
})();
