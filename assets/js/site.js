/* ==========================================================================
   Sailing International Trade — site behaviour
   All text, products and photos come from the JSON files in /content
   (edited with the online editor). This script loads them, renders the page
   in the chosen language (English / 中文 / Français) and runs the product
   tabs, quote list and enquiry form.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PAGE = document.body.dataset.page;
  // arriving from the warehouse tour: the page fades in from white with a gentle zoom on the product photo
  try { if (sessionStorage.getItem('sit-arrive')) { sessionStorage.removeItem('sit-arrive'); document.documentElement.classList.add('arrive'); } } catch (e) { /* ignore */ }
  const LANGS = ['en', 'zh', 'fr'];
  const HTML_LANG = { en: 'en', zh: 'zh-Hans', fr: 'fr-CA' };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- language ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  function initialLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) { store.set('sit-lang', q); return q; }   // a shared ?lang= link keeps that language on the next pages too
    const saved = store.get('sit-lang', null);
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : nav.startsWith('fr') ? 'fr' : 'en';
  }
  let lang = initialLang();
  // a translatable value is either a plain string or { en, zh, fr }
  const t = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[lang] || v.en || ''));

  /* ---------- content ---------- */
  const PRODUCT_KINDS = ['glass', 'mirrors', 'accessories'];
  const FILES = {
    settings: 'content/settings.json',
    ui: 'content/ui.json',
    credits: 'content/credits.json',
    home: 'content/pages/home.json',
  };
  if (PAGE === 'about') FILES.page = 'content/pages/about.json';
  if (PAGE === 'contact') FILES.page = 'content/pages/contact.json';
  if (PAGE === 'catalogue') { FILES.page = 'content/pages/catalogue.json'; FILES.catalogue = 'assets/catalogue/pages.json'; }
  if (PAGE === 'index') FILES.page = 'content/pages/home.json';
  if (PRODUCT_KINDS.includes(PAGE) || PAGE === 'index') {
    FILES.productPages = 'content/product-pages.json';
    PRODUCT_KINDS.forEach((k) => { FILES[k] = `content/${k}.json`; });
  }
  const C = {};
  const load = () => Promise.all(Object.entries(FILES).map(([key, url]) =>
    fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }).then((d) => { C[key] = d; })));

  const ui = (k) => t(C.ui && C.ui[k]);
  const icon = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></g></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></g></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const telHref = (p) => `tel:+1${String(p).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')}`;
  const mapsUrl = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.settings.mapQuery)}`;
  const mapEmbed = () => `<iframe title="${esc(t(C.settings.address))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(C.settings.mapQuery)}&z=15&output=embed"></iframe>`;
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ======================================================================
     Generic bindings: data-ui, data-set, data-c, data-pp, data-home
     ====================================================================== */
  function bindAll() {
    document.documentElement.lang = HTML_LANG[lang];
    $$('[data-ui]').forEach((el) => { const v = ui(el.dataset.ui); if (v) el.textContent = v; });
    $$('[data-ui-label]').forEach((el) => { const v = ui(el.dataset.uiLabel); if (v) el.setAttribute('aria-label', v); });
    $$('[data-ui-ph]').forEach((el) => { el.placeholder = ui(el.dataset.uiPh); });
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));

    const S = C.settings;
    $$('[data-set]').forEach((el) => {
      const k = el.dataset.set;
      if (k === 'phone-link') { el.href = telHref(S.phone); el.textContent = S.phone; }
      else if (k === 'email-link') { el.href = `mailto:${S.email}`; el.textContent = S.email; }
      else if (k === 'address') el.textContent = t(S.address);
      else if (k === 'phone-link-card') { el.href = telHref(S.phone); el.innerHTML = `<span class="ic">${icon.phone}</span><span><small>${esc(ui('call_us'))}</small><b>${esc(S.phone)}</b></span>`; }
      else if (k === 'email-link-card') { el.href = `mailto:${S.email}`; el.innerHTML = `<span class="ic">${icon.mail}</span><span><small>${esc(ui('email_us'))}</small><b>${esc(S.email)}</b></span>`; }
      else if (k === 'address-card') { el.href = mapsUrl(); el.innerHTML = `<span class="ic">${icon.pin}</span><span><small>${esc(ui('visit_us'))}</small><b>${esc(t(S.address))}</b></span>`; }
      else el.textContent = t(S[k]);
    });

    const bind = (attr, src) => {
      if (!src) return;
      $$(`[data-${attr}]`).forEach((el) => { el.textContent = t(src[el.dataset[attr]]); });
      $$(`[data-${attr}-src]`).forEach((el) => { const v = src[el.dataset[`${attr}Src`]]; if (v && el.getAttribute('src') !== v) el.src = v; });
    };
    bind('c', C.page);
    bind('home', C.home);
    if (C.productPages && C.productPages[PAGE]) bind('pp', C.productPages[PAGE]);
    const company = C.settings.companyName;
    document.title = PAGE === 'index' ? `${company} | ${ui('page_title_suffix')}`
      : C.productPages && C.productPages[PAGE] ? `${t(C.productPages[PAGE].title)} | ${company}`
      : C.page && C.page.hero_title ? `${t(C.page.hero_title)} | ${company}`
      : PAGE === '404' ? `${ui('nf_title')} | ${company}` : document.title;
    $('#year').textContent = new Date().getFullYear();
    $('#credits-list').innerHTML = (C.credits.items || []).map((c) =>
      `<li>“${esc(c.title)}” — ${esc(c.author)}, <a href="${esc(c.source)}" target="_blank" rel="noopener">Wikimedia Commons</a>, ${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a>` : esc(c.license)}</li>`).join('');
  }

  /* ======================================================================
     Quote list (kept in this browser, shared by every page)
     ====================================================================== */
  const QKEY = 'sit-quote-v2';
  let quote = store.get(QKEY, []).filter((q) => q && q.key && q.name);
  const registry = {}; // key -> { key, kind, id, name, photo } for products shown on this page
  const inQuote = (key) => quote.some((q) => q.key === key);
  const saveQuote = () => store.set(QKEY, quote);
  const drawer = $('#drawer');
  const overlay = $('#overlay');
  let drawerReturn = null;

  function lockScroll(on) {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.toggle('locked', on);
    document.body.style.paddingRight = on && sbw > 0 ? `${sbw}px` : '';
  }
  function openDrawer() {
    drawerReturn = document.activeElement;
    drawer.classList.add('open'); overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => $('.icon-btn', drawer).focus({ preventScroll: true }), 60);
  }
  function closeDrawer(restore = true) {
    drawer.classList.remove('open'); overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (restore && drawerReturn && document.contains(drawerReturn)) drawerReturn.focus({ preventScroll: true });
  }
  const kindLabel = (kind) => ui(`nav_${kind}`);
  const itemUrl = (q) => `${q.kind}.html#${q.id}`;
  function renderQuote() {
    const n = quote.length;
    const count = $('#quote-count');
    count.textContent = n;
    count.toggleAttribute('data-zero', n === 0);
    $('#drawer-count').textContent = n;
    $('.quote-btn').setAttribute('aria-label', `${ui('quote_list')} (${n})`);
    $('#drawer-list').innerHTML = n
      ? quote.map((q) => `<li class="d-item">
          <a href="${itemUrl(q)}"><img src="${esc(q.photo)}" alt="" loading="lazy"></a>
          <span class="d-info"><a href="${itemUrl(q)}"><b>${esc(t(q.name))}</b></a><small>${esc(kindLabel(q.kind))}</small></span>
          <button class="icon-btn" type="button" data-remove="${esc(q.key)}" aria-label="${esc(ui('remove'))} ${esc(t(q.name))}">${icon.x}</button></li>`).join('')
      : `<li class="d-empty"><strong>${esc(ui('list_empty'))}</strong><span>${esc(ui('list_empty_hint'))}</span></li>`;
    $$('[data-add]').forEach((b) => {
      const on = inQuote(b.dataset.add);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? `✓ ${ui('in_quote')}` : `+ ${ui('add_to_quote')}`;
    });
    renderPicked();
  }
  let toastTimer;
  function toast(html) {
    $('#toast-msg').innerHTML = html;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3400);
  }
  function toggleQuote(key) {
    if (inQuote(key)) quote = quote.filter((q) => q.key !== key);
    else {
      const item = registry[key];
      if (!item) return;
      quote.push(item);
      toast(`<b>${esc(t(item.name))}</b> — ${esc(ui('added_toast'))}`);
      const btn = $('.quote-btn');
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    }
    saveQuote();
    renderQuote();
  }
  window.addEventListener('storage', (e) => { if (e.key === QKEY) { quote = store.get(QKEY, []); renderQuote(); } });

  /* ======================================================================
     Product explorer: tabs that switch photo, description and specs
     ====================================================================== */
  const narrow = window.matchMedia('(max-width: 1100px)');
  narrow.addEventListener('change', () => { const list = $('.ex-tabs'); if (list) list.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical'); });
  function explorer(el, kind) {
    const data = C[kind];
    const items = data.items || [];
    const groups = kind === 'accessories' ? (data.categories || []) : null;
    const accById = Object.fromEntries(((C.accessories && C.accessories.items) || []).map((a) => [a.id, a]));
    let current = (location.hash.slice(1) && items.some((i) => i.id === location.hash.slice(1))) ? location.hash.slice(1) : (items[0] && items[0].id);
    let slide = 0;

    items.forEach((it) => { registry[`${kind}:${it.id}`] = { key: `${kind}:${it.id}`, kind, id: it.id, name: it.name, photo: it.photo }; });

    function tabsHtml() {
      const tab = (it) => `<button class="ex-tab" type="button" role="tab" id="tab-${esc(it.id)}" aria-controls="ex-panel" aria-selected="${it.id === current}" tabindex="${it.id === current ? 0 : -1}" data-ex="${esc(it.id)}">
          <img src="${esc(it.photo)}" alt="" loading="lazy"><span>${esc(t(it.name))}</span></button>`;
      if (!groups) return items.map(tab).join('');
      return groups.map((g) => {
        const inGroup = items.filter((i) => i.category === g.id);
        return inGroup.length ? `<div class="ex-group" role="presentation">${esc(t(g.name))}</div>${inGroup.map(tab).join('')}` : '';
      }).join('');
    }
    function gallery(it) {
      const g = [{ type: 'img', src: it.photo, caption: '' }];
      if (kind === 'accessories' && window.SIT_DIAGRAMS && window.SIT_DIAGRAMS[it.id]) g.push({ type: 'diagram' });
      (it.gallery || []).forEach((x) => g.push({ type: 'img', src: x.image, caption: x.caption }));
      return g;
    }
    function creditFor(src) {
      const c = (C.credits.items || []).find((x) => x.file === src);
      return c ? ` · Photo: <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.author)}</a>, ${esc(c.license)}` : '';
    }
    function stageHtml(it, g) {
      const s = g[slide] || g[0];
      if (s.type === 'diagram') return { html: window.SIT_DIAGRAMS[it.id], cls: 'diagram', cap: esc(ui('diagram_label')) };
      const isIllustration = /\.svg$/i.test(s.src);
      const cap = esc(t(s.caption)) || (isIllustration ? esc(ui('photo_coming')) : '');
      if (isIllustration) return { html: `<img src="${esc(s.src)}" alt="${esc(t(it.name))}">`, cls: '', cap: cap + creditFor(s.src) };
      // photos of any shape are shown whole; a soft blurred copy of the same photo fills the rest of the frame
      return {
        html: `<img class="ex-fill" src="${esc(s.src)}" alt="" aria-hidden="true"><img class="ex-photo" src="${esc(s.src)}" alt="${esc(t(it.name))}">`,
        cls: 'photo', cap: cap + creditFor(s.src),
      };
    }
    function panelHtml() {
      const it = items.find((i) => i.id === current);
      if (!it) return '';
      const g = gallery(it);
      const st = stageHtml(it, g);
      const group = groups ? groups.find((x) => x.id === it.category) : null;
      const key = `${kind}:${it.id}`;
      const labels = { img: ui('photo_label'), diagram: ui('diagram_label') };
      const related = (it.related || []).map((rid) => accById[rid]).filter(Boolean);
      return `
        <div class="ex-media">
          <div class="ex-stage ${st.cls}">${st.html}</div>
          <p class="ex-caption">${st.cap}</p>
          ${g.length > 1 ? `<div class="ex-thumbs">${g.map((x, i) => {
            // the main photo and the diagram get a short tag; extra photos are named by their own caption
            const tag = i === 0 ? labels.img : x.type === 'diagram' ? labels.diagram : '';
            const name = tag || t(x.caption) || ui('in_use_label');
            return `<button class="ex-thumb" type="button" data-slide="${i}" aria-pressed="${i === slide}" aria-label="${esc(name)}" title="${esc(name)}">
            ${x.type === 'diagram' ? window.SIT_DIAGRAMS[it.id] : `<img src="${esc(x.src)}" alt="" loading="lazy">`}${tag ? `<span class="lbl">${esc(tag)}</span>` : ''}</button>`;
          }).join('')}</div>` : ''}
        </div>
        <div class="ex-info">
          <span class="ex-cat">${esc(group ? t(group.name) : t(C.productPages[kind].title))}</span>
          <h2>${esc(t(it.name))}</h2>
          <p class="ex-short">${esc(t(it.short))}</p>
          <p class="ex-desc">${esc(t(it.description))}</p>
          ${(it.specs || []).length ? `<h3>${esc(ui('tab_specs'))}</h3>
          <table class="spec-table"><tbody>${it.specs.map((s) => `<tr><th scope="row">${esc(t(s.label))}</th><td>${esc(t(s.value))}</td></tr>`).join('')}</tbody></table>
          <p class="spec-note">${esc(ui('specs_note'))}</p>` : ''}
          ${(it.uses || []).length ? `<h3>${esc(ui('typical_uses'))}</h3><ul class="check-list">${it.uses.map((u) => `<li>${esc(t(u))}</li>`).join('')}</ul>` : ''}
          ${(it.options || []).length ? `<h3>${esc(ui('can_be_specified'))}</h3><div class="chips">${it.options.map((o) => `<span>${esc(t(o))}</span>`).join('')}</div>` : ''}
          ${related.length ? `<h3>${esc(ui('goes_well_with'))}</h3><div class="chips">${related.map((r) => `<a href="accessories.html#${esc(r.id)}">${esc(t(r.name))}</a>`).join('')}</div>` : ''}
          <div class="ex-actions">
            <button class="btn btn-brand" type="button" data-add="${esc(key)}"></button>
            <a class="btn btn-outline" href="contact.html?type=Question&amp;about=${encodeURIComponent(t(it.name))}#quote">${esc(ui('ask_about'))}</a>
          </div>
        </div>`;
    }
    function render() {
      el.innerHTML = `<div class="ex-tabs" role="tablist" aria-orientation="${narrow.matches ? 'horizontal' : 'vertical'}" aria-label="${esc(t(C.productPages[kind].title))}">${tabsHtml()}</div>
        <article class="ex-panel" id="ex-panel" role="tabpanel" aria-labelledby="tab-${esc(current)}">${panelHtml()}</article>`;
      renderQuote();
      revealTab();
    }
    // keep the selected tab visible inside the tab list (vertical on desktop, a swipeable row on phones)
    function revealTab() {
      const list = $('.ex-tabs', el);
      const tab = $(`#tab-${CSS.escape(current)}`, el);
      if (!list || !tab) return;
      if (list.scrollWidth > list.clientWidth + 2) list.scrollLeft = tab.offsetLeft - list.offsetLeft - 12;
      else if (list.scrollHeight > list.clientHeight + 2) {
        const top = tab.offsetTop - list.offsetTop;
        if (top < list.scrollTop || top + tab.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top - 60;
      }
    }
    function select(id, focusTab, scroll) {
      if (!items.some((i) => i.id === id)) return;
      current = id; slide = 0;
      $$('.ex-tab', el).forEach((b) => { const on = b.dataset.ex === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focusTab) b.focus(); });
      const panel = $('#ex-panel', el);
      panel.setAttribute('aria-labelledby', `tab-${id}`);
      panel.innerHTML = panelHtml();
      panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
      renderQuote();
      history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
      revealTab();
      if (scroll && panel.getBoundingClientRect().top < 60) panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (scroll && window.innerWidth <= 1100 && panel.getBoundingClientRect().top > window.innerHeight * 0.6) panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    el.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-ex]');
      if (tab) { select(tab.dataset.ex, false, true); return; }
      const th = e.target.closest('[data-slide]');
      if (th) {
        slide = Number(th.dataset.slide);
        const it = items.find((i) => i.id === current);
        const g = gallery(it); const st = stageHtml(it, g);
        const stage = $('.ex-stage', el);
        stage.className = `ex-stage ${st.cls}`; stage.innerHTML = st.html;
        $('.ex-caption', el).innerHTML = st.cap;
        $$('.ex-thumb', el).forEach((b, i) => b.setAttribute('aria-pressed', String(i === slide)));
      }
    });
    el.addEventListener('keydown', (e) => {
      if (!e.target.closest('[role="tab"]')) return;
      const ids = $$('.ex-tab', el).map((b) => b.dataset.ex);
      const i = ids.indexOf(current);
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = ids[(i + 1) % ids.length];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = ids[(i - 1 + ids.length) % ids.length];
      else if (e.key === 'Home') next = ids[0];
      else if (e.key === 'End') next = ids[ids.length - 1];
      if (next) { e.preventDefault(); select(next, true, false); }
    });
    window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== current) select(id, false, true); });
    return { render };
  }

  /* ======================================================================
     Page renderers
     ====================================================================== */
  let explorerInstance = null;
  const PAGES = {
    index() {
      const H = C.page;
      $('#pillars').innerHTML = H.pillars.map((p, i) => `<div class="pillar reveal" style="--d:${i * 90}ms"><span class="num">${pad2(i + 1)}</span><h3>${esc(t(p.title))}</h3><p>${esc(t(p.text))}</p></div>`).join('');
      const cats = [
        { kind: 'glass', img: 'assets/img/glass/insulated.jpg', text: H.cat_glass_text },
        { kind: 'mirrors', img: 'assets/img/glass/mirror.jpg', text: H.cat_mirrors_text },
        { kind: 'accessories', img: 'assets/img/products/removable-shelf.jpg', text: H.cat_accessories_text },
      ];
      $('#cat-cards').innerHTML = cats.map((c, i) => `<a class="cat-card reveal" style="--d:${i * 90}ms" href="${c.kind}.html">
        <div class="img"><img src="${c.img}" alt="" loading="lazy"></div>
        <div class="body"><h3>${esc(ui(`nav_${c.kind}`))}</h3><p>${esc(t(c.text))}</p><span class="more">${esc(ui('cta_explore'))} →</span></div></a>`).join('');
      const words = [
        ...C.glass.items.map((g) => ({ href: `glass.html#${g.id}`, name: g.name })),
        ...C.mirrors.items.map((m) => ({ href: `mirrors.html#${m.id}`, name: m.name })),
        ...C.accessories.categories.map((c) => ({ href: `accessories.html#${(C.accessories.items.find((i) => i.category === c.id) || {}).id || ''}`, name: c.name })),
      ];
      $('#word-list').innerHTML = words.map((w, i) => `<a href="${w.href}">${esc(t(w.name))}</a>${i < words.length - 1 ? '<span class="bar">|</span>' : ''}`).join(' ');
      const links = [['contact.html#quote', 'cta_quote'], ['about.html', 'cta_learn_more'], ['accessories.html', 'cta_view_products']];
      $('#services').innerHTML = H.services.map((s, i) => `<div class="split-row ${i % 2 ? 'flip' : 'dark'}">
        <div class="split-media"><img src="${esc(s.image)}" alt="" loading="lazy"></div>
        <div class="split-text reveal"><h3 class="h-up">${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p>
          <a class="btn btn-outline" href="${links[i % links.length][0]}">${esc(ui(links[i % links.length][1]))}</a></div></div>`).join('');
      const S = C.settings;
      $('#location').innerHTML = `<div class="loc-info">
          <h3>${esc(S.companyName)}</h3>
          <p>${esc(t(S.address))}</p>
          <p><a href="${telHref(S.phone)}">${esc(S.phone)}</a><br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>
          <a class="btn btn-outline btn-sm" href="${mapsUrl()}" target="_blank" rel="noopener" style="justify-self:start">${esc(ui('directions'))}</a>
        </div><div class="map-frame">${mapEmbed()}</div>`;
    },
    glass() { explorerInstance = explorerInstance || explorer($('#explorer'), 'glass'); explorerInstance.render(); },
    mirrors() { explorerInstance = explorerInstance || explorer($('#explorer'), 'mirrors'); explorerInstance.render(); },
    accessories() { explorerInstance = explorerInstance || explorer($('#explorer'), 'accessories'); explorerInstance.render(); },
    about() {
      const A = C.page;
      $('#values').innerHTML = A.values.map((v, i) => `<div class="pillar reveal" style="--d:${i * 80}ms"><span class="num">${pad2(i + 1)}</span><h3>${esc(t(v.title))}</h3><p>${esc(t(v.text))}</p></div>`).join('');
      $('#about-services').innerHTML = A.services.map((s, i) => `<div class="service reveal" style="--d:${(i % 3) * 80}ms"><span class="num">${pad2(i + 1)}</span><h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p></div>`).join('');
      // market presence: figures, market list and globe labels (the globe itself is drawn by globe.js)
      if ($('#market-stats') && A.markets) {
        $('#market-stats').innerHTML = (A.market_stats || []).map((s) => `<div><strong>${esc(s.value)}</strong><span>${esc(t(s.label))}</span></div>`).join('');
        $('#market-list').innerHTML = A.markets.map((m, i) => `<button type="button" data-market="${esc(m.id)}" class="${i ? '' : 'hub'}" aria-pressed="false">
          <i aria-hidden="true"></i><span>${esc(t(m.name))}${t(m.note) ? `<small>${esc(t(m.note))}</small>` : ''}</span></button>`).join('');
        $('#globe-labels').innerHTML = A.markets.map((m, i) => `<span data-market="${esc(m.id)}" class="${i ? '' : 'hub'}">${esc(t(m.name))}</span>`).join('');
      }
      $('#serve').innerHTML = A.serve.map((s, i) => `<div class="photo-card reveal" style="--d:${i * 80}ms"><img src="${esc(s.image)}" alt="" loading="lazy"><h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p></div>`).join('');
    },
    catalogue() {
      // the PDF and page previews come from assets/catalogue/pages.json (written by _src/make_catalogue.py)
      const P = C.page, K = C.catalogue;
      $$('[data-cat-pdf]').forEach((a) => a.setAttribute('href', K.pdf));
      $('.cat-cover').setAttribute('aria-label', `${t(P.intro_title)} (PDF)`);
      const size = lang === 'fr' ? String(K.sizeMB).replace('.', ',') : String(K.sizeMB);
      $('#cat-meta').textContent = t(P.meta).replace('{pages}', K.pages.length).replace('{size}', size);
      $('#cat-contents').innerHTML = (P.contents || []).map((c) => `<li>${esc(t(c))}</li>`).join('');
      $('#cat-pages').innerHTML = K.pages.map((p, i) => `<a class="cat-page reveal" style="--d:${(i % 6) * 50}ms" href="${esc(K.pdf)}#page=${p.page}" target="_blank" rel="noopener" aria-label="${esc(t(P.page_label).replace('{n}', p.page))}">
        <img src="${esc(p.image)}" alt="" loading="lazy" width="510" height="660"><span>${pad2(p.page)}</span></a>`).join('');
    },
    contact() {
      const P = C.page;
      const map = $('#map');
      if (!map.firstChild) map.innerHTML = mapEmbed();
      $('#steps').innerHTML = P.steps.map((s, i) => `<li class="reveal" style="--d:${i * 80}ms"><h3>${esc(t(s.title))}</h3><p>${esc(t(s.text))}</p></li>`).join('');
      $('#faq').innerHTML = P.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(t(f.q))}</summary><p>${esc(t(f.a))}</p></details>`).join('');
      const params = new URLSearchParams(location.search);
      const type = params.get('type');
      if (type) { const r = $(`input[name="type"][value="${CSS.escape(type)}"]`); if (r) r.checked = true; }
      const about = params.get('about');
      const msg = $('#f-msg');
      if (about && msg && (!msg.value || msg.dataset.prefilled === msg.value)) {
        msg.value = `${ui('about_prefix')}: ${about.slice(0, 120)}\n`;
        msg.dataset.prefilled = msg.value;
      }
    },
  };

  function renderPicked() {
    const box = $('#picked');
    if (!box) return;
    box.innerHTML = quote.length
      ? quote.map((q) => `<span class="pick"><img src="${esc(q.photo)}" alt="">${esc(t(q.name))}<button type="button" data-remove="${esc(q.key)}" aria-label="${esc(ui('remove'))} ${esc(t(q.name))}">${icon.x}</button></span>`).join('')
      : `<span class="none">${esc(ui('form_items_none'))}</span>`;
  }

  /* ---------- enquiry form: sends by email through FormSubmit ---------- */
  function setupForm() {
    const form = $('#quote-form');
    if (!form) return;
    const status = $('#form-status');
    const show = (cls, html) => { status.hidden = false; status.className = `form-status ${cls}`; status.innerHTML = html; };
    form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f && e.target.checkValidity()) f.classList.remove('invalid'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let bad = null;
      $$('input[required]', form).forEach((inp) => { const ok = inp.checkValidity(); inp.closest('.field').classList.toggle('invalid', !ok); if (!ok && !bad) bad = inp; });
      if (bad) { show('err', esc(ui('form_required'))); bad.focus(); return; }
      const d = new FormData(form);
      if (d.get('_honey')) { show('ok', esc(ui('form_success'))); return; } // bot trap
      const items = quote.map((q) => `${t(q.name)} (${kindLabel(q.kind)})`).join('\n') || '-';
      const payload = {
        _subject: `${d.get('type')} request — ${d.get('company') || d.get('name')}`,
        _template: 'table', _captcha: 'false', _replyto: d.get('email'),
        'Request type': d.get('type'), Name: d.get('name'), Company: d.get('company') || '-', Email: d.get('email'), Phone: d.get('phone') || '-',
        Items: items, Details: d.get('message') || '-', Language: lang,
      };
      const mailto = `mailto:${C.settings.email}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(Object.entries(payload).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.textContent = ui('form_sending');
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(C.settings.quoteEmail)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
        });
        const res = await r.json().catch(() => ({}));
        if (r.ok && String(res.success) === 'true') { show('ok', esc(ui('form_success'))); form.reset(); }
        else show('err', `${esc(ui('form_error'))} <a href="${mailto}">${esc(C.settings.email)}</a>${res.message ? ` <br><small>${esc(res.message)}</small>` : ''}`);
      } catch (err) {
        show('err', `${esc(ui('form_error'))} <a href="${mailto}">${esc(C.settings.email)}</a>`);
      } finally {
        btn.disabled = false; btn.textContent = ui('form_send');
      }
    });
  }

  /* ======================================================================
     Header, menu, reveal-on-scroll
     ====================================================================== */
  const header = $('#site-header');
  const menuBtn = $('.menu-btn');
  const mnav = $('#mobile-nav');
  const updateHeader = () => header.classList.toggle('solid', window.scrollY > 40 || mnav.classList.contains('open'));
  window.addEventListener('scroll', updateHeader, { passive: true });
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', ui(open ? 'menu_close' : 'menu_open') || (open ? 'Close menu' : 'Open menu'));
    mnav.classList.toggle('open', open);
    updateHeader();
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$(`[data-nav="${PAGE === 'index' ? 'home' : PAGE}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
  const navGroup = $('.nav-group');
  const navParent = $('[data-nav-parent]');
  if (navGroup && navParent) {
    if (PRODUCT_KINDS.includes(PAGE) || PAGE === 'catalogue') navParent.classList.add('current');
    navParent.addEventListener('click', () => {
      const open = !navGroup.classList.contains('open');
      navGroup.classList.toggle('open', open);
      navParent.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav-group')) { navGroup.classList.remove('open'); navParent.setAttribute('aria-expanded', 'false'); } });
  }

  let io = null;
  if ('IntersectionObserver' in window && !reduceMotion) {
    io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  }
  const observeReveals = () => $$('.reveal:not(.in)').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

  /* ---------- global clicks & keys ---------- */
  document.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-lang]');
    if (lb) { setLang(lb.dataset.lang); return; }
    const t2 = e.target.closest('[data-add],[data-remove],[data-open-drawer],[data-close-drawer],[data-goto-quote],.mobile-nav a');
    if (!t2) return;
    if (t2.matches('.mobile-nav a')) { setMenu(false); return; }
    if (t2.dataset.add) { toggleQuote(t2.dataset.add); return; }
    if (t2.dataset.remove) { quote = quote.filter((q) => q.key !== t2.dataset.remove); saveQuote(); renderQuote(); return; }
    if (t2.hasAttribute('data-open-drawer')) { $('#toast').classList.remove('show'); openDrawer(); return; }
    if (t2.hasAttribute('data-goto-quote')) {
      if ($('#quote-form')) { e.preventDefault(); closeDrawer(false); $('#quote').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); setTimeout(() => $('#f-name').focus({ preventScroll: true }), 600); }
      return;
    }
    if (t2.hasAttribute('data-close-drawer')) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && drawer.classList.contains('open')) {
      const f = $$('a[href], button:not([disabled])', drawer).filter((el) => el.offsetParent !== null);
      if (f.length) {
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!drawer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.key !== 'Escape') return;
    if (drawer.classList.contains('open')) closeDrawer();
    else if (mnav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- language switching ---------- */
  function renderAll() {
    bindAll();
    if (PAGES[PAGE]) PAGES[PAGE]();
    renderQuote();
    observeReveals();
  }
  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l;
    store.set('sit-lang', l);
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); history.replaceState(null, '', u); }
    renderAll();
  }

  /* ---------- start ---------- */
  updateHeader();
  load().then(() => {
    renderAll();
    setupForm();
    document.documentElement.classList.add('ready');
    // jump straight to a linked product or section ('instant' overrides the page's smooth scrolling)
    const target = location.hash && (PRODUCT_KINDS.includes(PAGE) ? $('#explorer') : document.getElementById(location.hash.slice(1)));
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 16, behavior: 'instant' });
  }).catch((err) => {
    console.error('Could not load site content', err);
    if (window.__siteErrors) window.__siteErrors.push(`content: ${err.message}`);
    document.documentElement.classList.add('ready');
    const m = $('#main');
    if (m) m.insertAdjacentHTML('afterbegin', '<p style="padding:120px 20px 40px;text-align:center">Content could not be loaded. Please open the site through a web server (see README).</p>');
  });
})();
