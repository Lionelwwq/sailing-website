/* ==========================================================================
   Sailing International Trade — Accessories catalogue
   Product data + hand-built SVG illustrations (no image files needed).
   Edit text, specs and photos here; the page renders everything from this file.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- illustration helpers ---------- */
  const INK = '#1B2A44';
  const r1 = (n) => Math.round(n * 10) / 10;
  const wrap = (inner) =>
    `<svg class="illo" viewBox="0 0 240 180" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
  const shadow = (cx, cy, rx, ry) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g-floor)" stroke="none"/>`;
  const star = (cx, cy, r, fill) =>
    `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${fill}" stroke="none"/>`;
  const bar = (x1, y1, x2, y2, w = 5) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w + 2.4}"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#55657D" stroke-width="${w}"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#AEBCCD" stroke-width="1.1" transform="translate(-.8 -.8)"/>`;
  const txt = (x, y, s, size, extra = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" stroke="none" text-anchor="middle" ${extra}>${s}</text>`;
  function rand(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const shield = (cx, top, label) =>
    `<path d="M${cx} ${top} L${cx + 22} ${top + 7} V${top + 26} Q${cx + 22} ${top + 43} ${cx} ${top + 52} Q${cx - 22} ${top + 43} ${cx - 22} ${top + 26} V${top + 7} Z" fill="url(#g-ink)"/>` +
    txt(cx, top + 21, 'CAT', 7, 'fill="#9FB3CC" letter-spacing="1"') +
    txt(cx, top + 40, label, label.length > 1 ? 15 : 17, 'fill="#5EE7DF"');

  /* ---------- illustrations ---------- */
  const ILLO = {
    'cork-pads'() {
      const pad = (x, y) =>
        `<path d="M${x - 11} ${y}v4a11 5.5 0 0 0 22 0v-4" fill="#A86F38"/>` +
        `<ellipse cx="${x}" cy="${y}" rx="11" ry="5.5" fill="url(#g-cork)"/>` +
        `<g fill="#8A5A2B" stroke="none"><circle cx="${x - 4}" cy="${y - 0.5}" r=".9"/><circle cx="${x + 3.5}" cy="${y + 1.5}" r=".9"/><circle cx="${x + 1}" cy="${y - 2.6}" r=".7"/><circle cx="${x - 1}" cy="${y + 2.4}" r=".6"/></g>`;
      const dot = (x, y) =>
        `<circle cx="${x}" cy="${y}" r="9" fill="url(#g-cork)"/>` +
        `<g fill="#8A5A2B" stroke="none"><circle cx="${x - 3}" cy="${y - 2}" r=".9"/><circle cx="${x + 3}" cy="${y + 2}" r=".9"/><circle cx="${x + 2}" cy="${y - 3.2}" r=".7"/><circle cx="${x - 2.4}" cy="${y + 3}" r=".6"/></g>`;
      return `${shadow(120, 158, 98, 16)}
        <path d="M30 110 L110 150 L210 100 L210 106 L110 156 L30 116 Z" fill="#8FC3E3"/>
        <path d="M30 110 L130 60 L210 100 L110 150 Z" fill="url(#g-glass)"/>
        <path d="M50 112 L120 77" stroke="#fff" stroke-width="3" stroke-opacity=".85"/>
        <path d="M62 120 L96 103" stroke="#fff" stroke-width="2" stroke-opacity=".6"/>
        ${pad(68, 106)}${pad(125, 80)}${pad(172, 100)}${pad(115, 126)}
        <g transform="translate(138 10) rotate(8)">
          <rect x="3" y="5" width="86" height="48" rx="6" fill="#0E1A2F" fill-opacity=".08" stroke="none"/>
          <rect width="86" height="48" rx="6" fill="#fff"/>
          ${dot(17, 15)}${dot(43, 15)}${dot(69, 15)}${dot(17, 33)}${dot(43, 33)}
          <circle cx="69" cy="33" r="9" stroke-dasharray="2.5 2.5" stroke-opacity=".45"/>
        </g>`;
    },

    'removable-shelf'() {
      let panes = '';
      for (let i = 4; i >= 0; i--) {
        const x = 50 + 10 * i, y = 52 - 6 * i;
        panes += `<rect x="${x}" y="${y}" width="110" height="82" rx="2" fill="url(#g-glass)" stroke="#3B6E95" stroke-opacity=".7"/>` +
          `<path d="M${x + 6} ${y + 6} H${x + 66}" stroke="#fff" stroke-width="2" stroke-opacity=".8"/>`;
      }
      const caster = (x, y, r = 6) =>
        `<line x1="${x}" y1="${y - r - 4}" x2="${x}" y2="${y - r}" stroke-width="2.4"/>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x}" cy="${y}" r="${r * 0.35}" fill="#9FB0C6" stroke="none"/>`;
      return `${shadow(126, 160, 102, 14)}
        ${caster(204, 128, 5)}
        ${bar(84, 110, 84, 16, 4)}${bar(208, 110, 208, 16, 4)}${bar(84, 16, 208, 16, 4)}
        <path d="M40 134 L172 134 L212 110 L80 110 Z" fill="#C9D3DF"/>
        <path d="M172 134 L212 110 L212 122 L172 146 Z" fill="#4A586E"/>
        <rect x="40" y="134" width="132" height="12" fill="url(#g-steel)"/>
        ${panes}
        ${bar(44, 134, 44, 40, 4)}${bar(168, 134, 168, 40, 4)}${bar(44, 40, 168, 40, 4)}${bar(44, 40, 84, 16, 4)}${bar(168, 40, 208, 16, 4)}
        ${caster(54, 156)}${caster(160, 156)}
        <circle cx="22" cy="36" r="14" fill="#fff"/>
        <path d="M22 27 V45 M17 32 L22 27 L27 32 M17 40 L22 45 L27 40" stroke-width="1.8"/>`;
    },

    'custom-rack'() {
      const pane = (pts, dx, dy) =>
        `<polygon points="${pts.map(([x, y]) => `${x + dx},${y + dy}`).join(' ')}" fill="url(#g-glass)" stroke="#3B6E95" stroke-opacity=".75"/>`;
      const L = [[46, 148], [116, 110], [151, 37], [81, 75]];
      const R = [[134, 148], [204, 110], [169, 37], [99, 75]];
      return `${shadow(125, 136, 104, 26)}
        ${bar(110, 112, 160, 8)}${bar(160, 8, 210, 112)}${bar(110, 112, 210, 112)}
        ${pane(R, 6, 2)}${pane(R, 0, 0)}
        ${bar(90, 46, 160, 8)}${bar(40, 150, 110, 112)}${bar(140, 150, 210, 112)}
        ${bar(40, 150, 90, 46)}${bar(90, 46, 140, 150)}${bar(40, 150, 140, 150)}
        ${pane(L, 0, 0)}${pane(L, -6, 2)}${pane(L, -12, 4)}
        <path d="M76 88 L126 62" stroke="#fff" stroke-width="2.5" stroke-opacity=".85"/>
        <path d="M60 120 L84 108" stroke="#fff" stroke-width="1.8" stroke-opacity=".6"/>
        <g stroke="#7A8AA0" stroke-width="1.2">
          <line x1="40" y1="168" x2="140" y2="168"/><line x1="40" y1="163" x2="40" y2="173"/><line x1="140" y1="163" x2="140" y2="173"/>
          <line x1="228" y1="8" x2="228" y2="112"/><line x1="223" y1="8" x2="233" y2="8"/><line x1="223" y1="112" x2="233" y2="112"/>
        </g>
        <rect x="80" y="161" width="20" height="14" rx="7" fill="#fff" stroke="#7A8AA0" stroke-width="1.2"/>
        ${txt(90, 170.8, 'W', 8.5, 'fill="#56657A"')}
        <rect x="218" y="53" width="20" height="14" rx="7" fill="#fff" stroke="#7A8AA0" stroke-width="1.2"/>
        ${txt(228, 62.8, 'H', 8.5, 'fill="#56657A"')}`;
    },

    'al-stock-shelf'() {
      let sheets = '';
      for (let k = 0; k <= 3; k++) {
        const dx = -5 * k, dy = 4 * k;
        const p = [[52, 138], [202, 138], [214, 40], [64, 40]].map(([x, y]) => `${x + dx},${y + dy}`).join(' ');
        sheets += `<polygon points="${p}" fill="url(#g-glass)" stroke="#3B6E95" stroke-opacity=".7"/>`;
      }
      return `${shadow(124, 162, 104, 12)}
        ${bar(100, 140, 114, 24, 4)}${bar(180, 140, 194, 24, 4)}${bar(113, 30, 193, 30, 4)}
        <path d="M30 153 L210 153 L222 136 L42 136 Z" fill="#C9D3DF"/>
        <path d="M210 153 L222 136 L222 145 L210 162 Z" fill="#4A586E"/>
        <rect x="30" y="153" width="180" height="9" fill="url(#g-steel)"/>
        ${sheets}
        <path d="M58 60 H160" stroke="#fff" stroke-width="2.6" stroke-opacity=".85"/>
        <polygon points="74,146 92,146 112,58 94,58" fill="#fff" fill-opacity=".28" stroke="none"/>
        <polygon points="100,146 106,146 126,58 120,58" fill="#fff" fill-opacity=".22" stroke="none"/>
        <rect x="12" y="4" width="34" height="28" rx="7" fill="#fff"/>
        <path d="M19 26 L29 9 L39 26 M23 20 H35" stroke="#55657D" stroke-width="2.4"/>
        <rect x="50" y="4" width="34" height="28" rx="7" fill="#fff" stroke="url(#g-iris)" stroke-width="2"/>
        <path d="M60 9 L62.5 26 L77 26" stroke="#55657D" stroke-width="2.4"/>`;
    },

    'glass-sling'() {
      const t = [0.2, 0.4, 0.6, 0.8];
      return `${shadow(122, 162, 94, 14)}
        <path d="M170 112 L194 98 L194 144 L170 158 Z" fill="#8FC3E3"/>
        ${t.map((v) => `<line x1="${r1(170 + 24 * v)}" y1="${r1(112 - 14 * v)}" x2="${r1(170 + 24 * v)}" y2="${r1(158 - 14 * v)}" stroke="#5E95BA" stroke-width="1"/>`).join('')}
        <rect x="50" y="112" width="120" height="46" fill="url(#g-glass)"/>
        <path d="M50 112 L170 112 L194 98 L74 98 Z" fill="#E2F4FB"/>
        ${t.map((v) => `<line x1="${r1(50 + 24 * v)}" y1="${r1(112 - 14 * v)}" x2="${r1(170 + 24 * v)}" y2="${r1(112 - 14 * v)}" stroke="#7FB2D3" stroke-width="1"/>`).join('')}
        <path d="M104 154 L126 118" stroke="#fff" stroke-width="3" stroke-opacity=".7"/>
        <path d="M111 57 L118 59 L90 112 L78 112 Z" fill="url(#g-amber)"/>
        <path d="M122 59 L129 57 L162 112 L150 112 Z" fill="url(#g-amber)"/>
        <rect x="78" y="112" width="12" height="46" fill="#E8891F"/>
        <rect x="150" y="112" width="12" height="46" fill="#E8891F"/>
        <g stroke="#FFE3B8" stroke-width="1" stroke-dasharray="3 3">
          <line x1="114" y1="61" x2="84" y2="111"/><line x1="125.5" y1="61" x2="156" y2="111"/>
          <line x1="84" y1="115" x2="84" y2="156"/><line x1="156" y1="115" x2="156" y2="156"/>
        </g>
        <rect x="106" y="4" width="28" height="22" rx="5" fill="url(#g-steel)"/>
        <circle cx="120" cy="15" r="5.5" fill="#A9B7C9"/>
        <path d="M120 26 V36 C120 47 107 48 106 40" stroke="${INK}" stroke-width="6"/>
        <path d="M120 26 V36 C120 47 107 48 106 40" stroke="#8C9BB0" stroke-width="3.2"/>
        <ellipse cx="120" cy="52" rx="10" ry="6" stroke="${INK}" stroke-width="5.5"/>
        <ellipse cx="120" cy="52" rx="10" ry="6" stroke="#8C9BB0" stroke-width="3"/>
        <rect x="141" y="78" width="24" height="12" rx="3" fill="#fff"/>
        ${txt(153, 86.6, 'WLL', 6.8, `fill="${INK}"`)}`;
    },

    'eva-film'() {
      const plate = (y, fill, edge) =>
        `<path d="M172 ${y + 10} L201 ${y + 20} L230 ${y + 10} L230 ${y + 13} L201 ${y + 23} L172 ${y + 13} Z" fill="${edge}"/>` +
        `<path d="M172 ${y + 10} L201 ${y} L230 ${y + 10} L201 ${y + 20} Z" fill="${fill}"/>`;
      return `${shadow(140, 156, 98, 12)}
        <path d="M60 112 L150 112 C172 128 192 140 226 148 L136 148 C104 140 82 128 60 112 Z" fill="url(#g-film)"/>
        <path d="M74 118 C98 132 118 140 148 144" stroke="#fff" stroke-width="2.2" stroke-opacity=".8"/>
        <path d="M60 48 H150 A18 32 0 0 1 150 112 H60 A18 32 0 0 1 60 48 Z" fill="url(#g-film)"/>
        <path d="M60 58 H146" stroke="#fff" stroke-width="3" stroke-opacity=".75"/>
        <path d="M60 66 H118" stroke="#fff" stroke-width="1.5" stroke-opacity=".5"/>
        <ellipse cx="150" cy="80" rx="18" ry="32" fill="#E9E3FF"/>
        <ellipse cx="150" cy="80" rx="13" ry="23" stroke="#B7A8F5"/>
        <ellipse cx="150" cy="80" rx="7.5" ry="13" fill="#fff"/>
        <ellipse cx="150" cy="80" rx="4" ry="7.5" fill="#C9CFE0"/>
        ${plate(44, 'url(#g-glass)', '#8FC3E3')}${plate(26, 'url(#g-film)', '#A897F0')}${plate(8, 'url(#g-glass)', '#8FC3E3')}
        ${star(214, 74, 4.5, '#B190FF')}`;
    },

    'aluminum-spacer'() {
      const O = [[40, 100], [130, 55], [210, 95], [120, 140]];
      const I = [[57, 99.5], [129, 63.5], [193, 95.5], [121, 131.5]];
      const poly = (pts, dy = 0) => 'M' + pts.map(([x, y]) => `${x} ${y + dy}`).join(' L') + ' Z';
      let dots = '';
      for (let t = 0.1; t < 0.95; t += 0.1) {
        dots += `<circle cx="${r1(57 + 72 * t)}" cy="${r1(103.5 - 36 * t)}" r="1.1"/>`;
        dots += `<circle cx="${r1(129 + 64 * t)}" cy="${r1(67.5 + 32 * t)}" r="1.1"/>`;
      }
      const beads = [[189, 36.5], [195, 36.5], [201, 36.5], [192, 41.5], [198, 41.5], [204, 41.5], [186.5, 41.5]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4"/>`).join('');
      return `${shadow(126, 152, 98, 18)}
        <path d="${poly(O, 8)} ${poly(I, 8)}" fill="#7C8BA2" fill-rule="evenodd"/>
        <path d="${poly(O)} ${poly(I)}" fill="url(#g-metal)" fill-rule="evenodd"/>
        <g fill="${INK}" fill-opacity=".55" stroke="none">${dots}</g>
        <path d="M60 104 L118 133" stroke="#fff" stroke-width="1.6" stroke-opacity=".8"/>
        <path d="M134 60 L200 93" stroke="#fff" stroke-width="1.4" stroke-opacity=".6"/>
        <path d="M178 62 L166 78" stroke-dasharray="3 3" stroke-opacity=".55"/>
        <circle cx="196" cy="40" r="28" fill="#fff"/>
        <circle cx="196" cy="40" r="28" stroke="url(#g-iris)" stroke-width="2.5"/>
        <rect x="181" y="29" width="30" height="20" rx="3" fill="url(#g-metal)"/>
        <rect x="184.5" y="32.5" width="23" height="13" rx="2" fill="#F5EFE0"/>
        <g fill="url(#g-bead)" stroke="#8C7F62" stroke-width=".8">${beads}</g>
        <g fill="#fff" stroke="none"><rect x="189" y="47.6" width="2.2" height="2.6"/><rect x="195" y="47.6" width="2.2" height="2.6"/><rect x="201" y="47.6" width="2.2" height="2.6"/></g>
        <g stroke="#7A8AA0" stroke-width="1"><line x1="181" y1="55" x2="211" y2="55"/><line x1="181" y1="52.5" x2="181" y2="57.5"/><line x1="211" y1="52.5" x2="211" y2="57.5"/></g>`;
    },

    'green-adhesive'() {
      return `${shadow(118, 150, 98, 16)}
        <path d="M150 104 C174 112 196 124 228 128 L226 141 C194 137 172 126 151 118 Z" fill="url(#g-green)"/>
        <path d="M160 112 C180 119 200 128 222 132" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>
        <path d="M48 96 L48 118 A52 30 0 0 0 152 118 L152 96 A52 30 0 0 1 48 96 Z" fill="url(#g-green-side)"/>
        <path d="M48 107 A52 30 0 0 0 152 107" stroke="#fff" stroke-opacity=".25"/>
        <ellipse cx="100" cy="96" rx="52" ry="30" fill="url(#g-green)"/>
        <ellipse cx="100" cy="96" rx="43" ry="24.5" stroke="#fff" stroke-opacity=".35"/>
        <ellipse cx="100" cy="96" rx="34" ry="19.5" stroke="#fff" stroke-opacity=".3"/>
        <ellipse cx="100" cy="96" rx="26" ry="15" fill="#EAD9B6"/>
        <ellipse cx="100" cy="97.5" rx="20" ry="11" fill="#C8D3E0"/>
        <path d="M81 96 A20 11 0 0 1 119 96" stroke="#9E8D6A" stroke-opacity=".6"/>
        <g stroke="#FF8A5B" stroke-width="2" stroke-opacity=".85">
          <path d="M74 56 q-5 -5 0 -10 q5 -5 0 -10 q-5 -5 0 -10"/>
          <path d="M100 50 q-5 -5 0 -10 q5 -5 0 -10 q-5 -5 0 -10"/>
          <path d="M126 56 q-5 -5 0 -10 q5 -5 0 -10 q-5 -5 0 -10"/>
        </g>
        <rect x="196" y="14" width="14" height="52" rx="7" fill="#fff"/>
        <rect x="200" y="30" width="6" height="38" rx="3" fill="#FF6B4A" stroke="none"/>
        <circle cx="203" cy="70" r="9.5" fill="#FF6B4A"/>
        <circle cx="200" cy="67" r="2.4" fill="#fff" fill-opacity=".6" stroke="none"/>
        <g stroke-width="1.2"><line x1="210" y1="24" x2="215" y2="24"/><line x1="210" y1="32" x2="215" y2="32"/><line x1="210" y1="40" x2="215" y2="40"/><line x1="210" y1="48" x2="215" y2="48"/></g>`;
    },

    'silicone-adhesive'() {
      return `${shadow(160, 162, 84, 12)}
        <path d="M96 130 L152 154 L232 120 L232 126 L152 160 L96 136 Z" fill="#8FC3E3"/>
        <path d="M96 130 L176 96 L232 120 L152 154 Z" fill="url(#g-glass)"/>
        <path d="M150 145 L210 120" stroke="#fff" stroke-width="2.4" stroke-opacity=".8"/>
        <path d="M100 129 L141 111.5" stroke="${INK}" stroke-width="9.5"/>
        <path d="M100 129 L141 111.5" stroke="#F1F4F9" stroke-width="6.5"/>
        <path d="M101 127 L139 110.8" stroke="#fff" stroke-width="1.8"/>
        <g transform="translate(18 30) rotate(28)">
          <rect x="-8" y="5" width="10" height="24" rx="2" fill="#C9D3DF"/>
          <rect x="0" y="0" width="110" height="34" rx="6" fill="url(#g-cart)"/>
          <rect x="22" y="0" width="58" height="34" fill="url(#g-ink)"/>
          <rect x="22" y="25" width="58" height="4" fill="url(#g-iris)" stroke="none"/>
          ${txt(51, 17, 'SILICONE', 7.5, 'fill="#fff" letter-spacing=".6"')}
          <path d="M110 6 L120 10 V24 L110 28 Z" fill="#E6EBF2"/>
          <path d="M120 12 L152 16 V18 L120 22 Z" fill="#F3F6FA"/>
          <path d="M6 6 H18" stroke="#fff" stroke-width="2" stroke-opacity=".9"/>
        </g>
        ${star(120, 98, 5, '#5EE7DF')}${star(222, 104, 4, '#B190FF')}`;
    },

    'molecular-sieve'() {
      const rows = [[95, 137.5, 3], [106, 124.5, 5], [117, 111.5, 7], [128, 105, 8], [139, 98.5, 9], [150, 92, 10]];
      let beads = '';
      rows.forEach(([y, x0, n]) => {
        for (let i = 0; i < n; i++) {
          const x = x0 + i * 13;
          beads += `<circle cx="${x}" cy="${y}" r="7" fill="url(#g-bead)"/><circle cx="${r1(x - 2.4)}" cy="${y - 2.6}" r="1.8" fill="#fff" stroke="none"/>`;
        }
      });
      let pores = '';
      let row = 0;
      for (let y = -27; y <= 27; y += 6.5, row++) {
        for (let x = -30; x <= 30; x += 7.5) {
          const xx = x + (row % 2 ? 3.75 : 0);
          if (xx * xx + y * y < 26 * 26) pores += `<circle cx="${r1(60 + xx)}" cy="${r1(58 + y)}" r="1.7"/>`;
        }
      }
      return `${shadow(150, 158, 80, 10)}
        <circle cx="60" cy="58" r="40" stroke-dasharray="3 4" stroke-opacity=".45"/>
        <path d="M90 84 L118 102" stroke-dasharray="3 3" stroke-opacity=".5"/>
        <circle cx="60" cy="58" r="33" fill="url(#g-bead)"/>
        <g fill="#9C8F70" fill-opacity=".5" stroke="none">${pores}</g>
        <path d="M38 44 A26 26 0 0 1 56 32" stroke="#fff" stroke-width="3" stroke-opacity=".9"/>
        <g stroke="#8C7F62" stroke-width="1">${beads}</g>
        <rect x="44" y="104" width="32" height="17" rx="8.5" fill="url(#g-ink)"/>
        ${txt(60, 115.8, '3Å', 9.5, 'fill="#fff"')}
        <path d="M176 22 C176 22 165 37 165 44 A11 11 0 0 0 187 44 C187 37 176 22 176 22 Z" fill="#8FD3FF"/>
        <path d="M171 44 A5 5 0 0 0 176 49" stroke="#fff" stroke-width="2"/>
        <path d="M180 60 Q186 78 162 88" stroke="#5B8CFF" stroke-width="1.8" stroke-dasharray="3 3"/>
        <path d="M168.9 88.9 L162 88 L166.2 82.5" stroke="#5B8CFF" stroke-width="1.8"/>`;
    },

    'water-jet'() {
      return `${shadow(120, 170, 108, 9)}
        <rect x="22" y="26" width="12" height="124" fill="url(#g-steel)"/>
        <rect x="206" y="26" width="12" height="108" fill="url(#g-steel)"/>
        <path d="M18 142 L118 108 L222 132 L122 166 Z" fill="#23324A"/>
        <path d="M18 142 L122 166 L122 176 L18 152 Z" fill="#3D4A5E"/>
        <path d="M122 166 L222 132 L222 142 L122 176 Z" fill="#56657D"/>
        <path d="M34 134 L122 155 L206 127 L206 132 L122 160 L34 139 Z" fill="#8FC3E3"/>
        <path d="M34 134 L118 106 L206 127 L122 155 Z" fill="url(#g-glass)"/>
        <path d="M60 132 L112 115" stroke="#fff" stroke-width="2.4" stroke-opacity=".8"/>
        <ellipse cx="150" cy="128" rx="26" ry="11" stroke-dasharray="3 3" stroke-opacity=".5"/>
        <path d="M124 128 A26 11 0 0 0 176 128" stroke="#0E6E8C" stroke-width="2"/>
        <rect x="14" y="14" width="212" height="14" rx="3" fill="url(#g-steel)"/>
        <line x1="18" y1="18" x2="222" y2="18" stroke="#A9B7C9" stroke-width="1.2"/>
        <rect x="106" y="24" width="36" height="28" rx="5" fill="url(#g-ink)"/>
        <circle cx="134" cy="32" r="2.2" fill="#5EE7DF" stroke="none"/>
        <path d="M112 44 H128" stroke="#5B8CFF" stroke-width="1.4" stroke-opacity=".9"/>
        <path d="M116 52 L132 52 L128 80 L120 80 Z" fill="url(#g-metal)"/>
        <rect x="121" y="80" width="6" height="5" fill="${INK}"/>
        <line x1="124" y1="86" x2="124" y2="127" stroke="#7FE3FF" stroke-width="8" stroke-opacity=".3"/>
        <line x1="124" y1="86" x2="124" y2="127" stroke="#E3FDFF" stroke-width="2.4"/>
        <line x1="124" y1="86" x2="124" y2="127" stroke="#38BDF8" stroke-width=".8"/>
        <g stroke="#38BDF8" stroke-width="1.4"><path d="M120 126 L111 119"/><path d="M121 124 L115 114"/><path d="M128 126 L137 120"/><path d="M127 124 L133 115"/></g>
        <g fill="#7FE3FF" stroke="none"><circle cx="108" cy="114" r="1.6"/><circle cx="139" cy="114" r="1.4"/><circle cx="114" cy="108" r="1.1"/><circle cx="134" cy="109" r="1.2"/></g>
        ${star(178, 100, 5, '#5EE7DF')}`;
    },

    'waterjet-abrasive'() {
      const rnd = rand(42);
      const cols = ['#B53A52', '#8E2A3E', '#D2566A', '#7A2236', '#C8475E'];
      const g = [];
      for (let i = 0; i < 150; i++) {
        const x = 146 + rnd() * 84;
        const h = Math.max(0, 30 * (1 - Math.abs(x - 190) / 42));
        const y = 157 - rnd() * h;
        g.push([x, y, 1.3 + rnd() * 1.7, cols[Math.floor(rnd() * cols.length)]]);
      }
      g.sort((a, b) => a[1] - b[1]);
      const grains = g.map(([x, y, r, c]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${c}"/>`).join('');
      return `${shadow(130, 160, 102, 12)}
        <path d="M52 40 Q58 30 70 33 L130 33 Q142 30 148 40 L154 140 Q154 154 140 154 L62 154 Q48 154 48 140 Z" fill="url(#g-kraft)"/>
        <path d="M56 45 H144" stroke-dasharray="2 3" stroke-opacity=".6"/>
        <path d="M62 56 Q70 100 60 146" stroke-opacity=".18"/>
        <path d="M138 56 Q130 96 142 146" stroke-opacity=".18"/>
        <rect x="66" y="68" width="68" height="58" rx="6" fill="url(#g-garnet)"/>
        <path d="M100 76 l7 6 l-7 6 l-7 -6 Z" fill="#fff" fill-opacity=".9" stroke="none"/>
        ${txt(100, 103, 'GARNET', 11, 'fill="#fff" letter-spacing=".6"')}
        ${txt(100, 116, '80 MESH', 7.5, 'fill="#fff" fill-opacity=".8" letter-spacing="1.2"')}
        <g stroke="none">${grains}</g>
        <path d="M190 72 L189 122" stroke-dasharray="3 3" stroke-opacity=".5"/>
        <circle cx="198" cy="46" r="26" fill="#fff"/>
        <circle cx="198" cy="46" r="26" stroke="url(#g-iris)" stroke-width="2.5"/>
        <polygon points="198,29 212,37 212,55 198,63 184,55 184,37" fill="url(#g-garnet)"/>
        <path d="M198 29 L198 46 L184 37 M198 46 L212 37 M198 46 L198 63 M184 55 L198 46 L212 55" stroke="#5C1626" stroke-width="1" stroke-opacity=".55"/>
        <polygon points="198,29 212,37 198,46 184,37" fill="#fff" fill-opacity=".3" stroke="none"/>`;
    },

    'grinding-wheels'() {
      const cx = 86, cy = 112, rx = 58, ry = 25, n = 18;
      const P = (a, sx, sy, dy = 0) => `${r1(cx + sx * Math.cos(a))},${r1(cy + sy * Math.sin(a) + dy)}`;
      let segTop = '', segSide = '';
      for (let k = 0; k < n; k++) {
        const a0 = (k * 2 * Math.PI) / n + 0.05, a1 = ((k + 1) * 2 * Math.PI) / n - 0.05;
        segTop += `<polygon points="${P(a0, rx, ry)} ${P(a1, rx, ry)} ${P(a1, rx - 9, ry - 3.9)} ${P(a0, rx - 9, ry - 3.9)}"/>`;
        if (Math.sin(a0) > 0.02 && Math.sin(a1) > 0.02)
          segSide += `<polygon points="${P(a0, rx, ry)} ${P(a1, rx, ry)} ${P(a1, rx, ry, 8)} ${P(a0, rx, ry, 8)}"/>`;
      }
      let gaps = '';
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8;
        gaps += `<line x1="${r1(176 + 39 * Math.cos(a))}" y1="${r1(72 + 39 * Math.sin(a))}" x2="${r1(176 + 46 * Math.cos(a))}" y2="${r1(72 + 46 * Math.sin(a))}"/>`;
      }
      let bolts = '';
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        bolts += `<circle cx="${r1(176 + 13 * Math.cos(a))}" cy="${r1(72 + 13 * Math.sin(a))}" r="1.6"/>`;
      }
      return `${shadow(118, 158, 106, 14)}
        <circle cx="182" cy="75" r="46" fill="#55657D"/>
        <circle cx="176" cy="72" r="46" fill="url(#g-metal)"/>
        <circle cx="176" cy="72" r="42.5" stroke="#24324A" stroke-width="7"/>
        <g stroke="#E6EBF1" stroke-width="2">${gaps}</g>
        <circle cx="176" cy="72" r="46"/>
        <circle cx="176" cy="72" r="39"/>
        <circle cx="176" cy="72" r="18" fill="url(#g-steel-light)"/>
        <g fill="${INK}" stroke="none">${bolts}</g>
        <circle cx="176" cy="72" r="7.5" fill="#fff"/>
        <path d="M150 48 A36 36 0 0 1 172 37" stroke="#fff" stroke-width="2.4" stroke-opacity=".9"/>
        ${star(222, 32, 6, '#5EE7DF')}${star(133, 42, 4, '#B190FF')}
        <path d="M28 112 L28 132 A58 25 0 0 0 144 132 L144 112 A58 25 0 0 1 28 112 Z" fill="url(#g-steel)"/>
        <g fill="${INK}" stroke="none">${segSide}</g>
        <ellipse cx="86" cy="112" rx="58" ry="25" fill="url(#g-metal)"/>
        <g fill="#24324A" stroke="none">${segTop}</g>
        <ellipse cx="86" cy="112" rx="58" ry="25"/>
        <ellipse cx="86" cy="112" rx="49" ry="21.1" stroke-opacity=".5"/>
        <ellipse cx="86" cy="113" rx="38" ry="16" fill="url(#g-steel-light)"/>
        <ellipse cx="86" cy="113" rx="15" ry="6.5" fill="#8C9BB0"/>
        <ellipse cx="86" cy="113" rx="7" ry="3" fill="${INK}"/>
        ${star(38, 90, 4.5, '#5EE7DF')}`;
    },

    'cerium-dioxide'() {
      return `${shadow(110, 162, 96, 12)}
        <polygon points="166,82 226,66 228,70 168,86" fill="#8FC3E3"/>
        <polygon points="162,42 222,26 226,66 166,82" fill="url(#g-glass)" stroke="#3B6E95"/>
        <path d="M172 50 L214 39" stroke="#fff" stroke-width="2.4" stroke-opacity=".85"/>
        ${star(224, 22, 7, '#5EE7DF')}${star(232, 50, 4.5, '#B190FF')}${star(160, 34, 4, '#5B8CFF')}
        <circle cx="194" cy="130" r="26" fill="#D9CDB6"/>
        <circle cx="190" cy="128" r="26" fill="#F6EFE2"/>
        <circle cx="190" cy="128" r="16" fill="#F1D58E" fill-opacity=".55" stroke="none"/>
        <g fill="#D8CBB0" stroke="none"><circle cx="176" cy="116" r="1"/><circle cx="202" cy="140" r="1"/><circle cx="206" cy="118" r="1"/><circle cx="178" cy="141" r="1"/></g>
        <circle cx="190" cy="128" r="8" fill="url(#g-steel)"/>
        <circle cx="190" cy="128" r="3" fill="#fff"/>
        <path d="M46 70 L54 148 A42 15 0 0 0 138 148 L146 70 A50 18 0 0 1 46 70 Z" fill="url(#g-cyl)"/>
        <path d="M49 96 Q96 114 143 96 L140 126 Q96 144 52 126 Z" fill="url(#g-ink)"/>
        <path d="M49 96 Q96 114 143 96 L142.6 100 Q96 118 49.4 100 Z" fill="url(#g-iris)" stroke="none"/>
        ${txt(96, 122, 'CeO₂', 14, 'fill="#fff"')}
        ${txt(96, 131, 'POLISHING POWDER', 5.2, 'fill="#9FB3CC" letter-spacing="1"')}
        <ellipse cx="96" cy="70" rx="50" ry="18" fill="#EEF2F7"/>
        <ellipse cx="96" cy="70" rx="45" ry="15.5" fill="url(#g-ceria)" stroke="#C9A955" stroke-width="1"/>
        <path d="M62 72 Q78 50 96 52 Q116 50 130 72 Q96 82 62 72 Z" fill="url(#g-ceria)" stroke="#C9A955" stroke-width="1"/>
        <path d="M80 60 Q90 54 100 55" stroke="#fff" stroke-width="2" stroke-opacity=".9"/>
        <g fill="#F1D58E" stroke="none"><circle cx="58" cy="52" r="1.6"/><circle cx="70" cy="44" r="1.2"/><circle cx="128" cy="48" r="1.4"/><circle cx="140" cy="56" r="1"/></g>`;
    },

    'vinyl-cat1'() {
      let mesh = '';
      for (let x = 78; x <= 178; x += 8) {
        const yEnd = x <= 152 ? 164 : 134 + (182 - x);
        mesh += `<line x1="${x}" y1="40" x2="${x}" y2="${yEnd}"/>`;
      }
      for (let y = 48; y <= 160; y += 8) {
        const xEnd = y <= 134 ? 182 : 182 - (y - 134);
        mesh += `<line x1="70" y1="${y}" x2="${xEnd}" y2="${y}"/>`;
      }
      return `${shadow(116, 168, 94, 10)}
        <rect x="40" y="20" width="112" height="124" rx="4" fill="url(#g-mirror)"/>
        <polygon points="58,20 80,20 40,66 40,42" fill="#fff" fill-opacity=".6" stroke="none"/>
        <polygon points="92,20 101,20 40,90 40,80" fill="#fff" fill-opacity=".45" stroke="none"/>
        <path d="M48 27 l7 5 l-2 6 M55 32 l9 -3" stroke="#7F91A8" stroke-width="1"/>
        <path d="M70 40 H182 V134 L152 164 H70 Z" fill="#F7F9FC" fill-opacity=".95" stroke="none"/>
        <g stroke="#CBD5E1" stroke-width=".7">${mesh}</g>
        <path d="M70 40 H182 V134 L152 164 H70 Z"/>
        <path d="M182 134 L152 164" stroke="${INK}" stroke-opacity=".25" stroke-width="4"/>
        <path d="M182 134 Q160 132 156 140 Q150 150 152 164 Z" fill="url(#g-vinyl)"/>
        ${shield(206, 12, 'I')}`;
    },

    'vinyl-cat2'() {
      // right panel shows the back of the mirror, covered in reinforced safety film
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const TL = [104, 31], TR = [170, 38], BR = [170, 142], BL = [104, 149];
      let mesh = '';
      for (let i = 1; i < 9; i++) {
        const t = i / 9, a = lerp(TL, TR, t), b = lerp(BL, BR, t);
        mesh += `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}"/>`;
      }
      for (let i = 1; i < 14; i++) {
        const t = i / 14, a = lerp(TL, BL, t), b = lerp(TR, BR, t);
        mesh += `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}"/>`;
      }
      return `${shadow(112, 168, 100, 10)}
        <polygon points="30,22 100,30 100,150 30,158" fill="url(#g-mirror)"/>
        <polygon points="44,23.6 60,25.4 30,62 30,42" fill="#fff" fill-opacity=".6" stroke="none"/>
        <polygon points="72,26.8 78,27.5 30,92 30,84" fill="#fff" fill-opacity=".4" stroke="none"/>
        <polygon points="104,31 170,38 170,142 104,149" fill="#F7F9FC"/>
        <g stroke="#CBD5E1" stroke-width=".7">${mesh}</g>
        <polygon points="104,31 170,38 170,142 104,149"/>
        <polygon points="146,35.3 170,38 170,64" fill="url(#g-mirror)"/>
        <path d="M146 35.3 L170 64" stroke="${INK}" stroke-opacity=".25" stroke-width="3"/>
        <path d="M146 35.3 Q152 52 144 60 Q158 60 170 64 Z" fill="url(#g-vinyl)"/>
        <line x1="26" y1="162" x2="174" y2="146" stroke-width="3"/>
        ${shield(212, 8, 'II')}
        <rect x="176" y="153" width="40" height="5" rx="2" fill="#8FA0B6"/>
        <rect x="170" y="145" width="9" height="21" rx="2" fill="url(#g-ink)"/>
        <rect x="213" y="145" width="9" height="21" rx="2" fill="url(#g-ink)"/>
        <rect x="179" y="148" width="5" height="15" rx="1.5" fill="#3D4A5E"/>
        <rect x="208" y="148" width="5" height="15" rx="1.5" fill="#3D4A5E"/>`;
    },
  };

  /* ---------- photo credits for images from Wikimedia Commons ---------- */
  const CREDITS = {
    'assets/img/online/curtain-wall.jpg': { author: 'Alvesgaspar', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Chicago_September_2016-21.jpg', title: 'Chicago September 2016-21' },
    'assets/img/online/facade-up.jpg': { author: 'Dietmar Rabich', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:M%C3%BCnster,_LVM_--_2017_--_6351-7.jpg', title: 'Münster, LVM, 2017' },
    'assets/img/online/window-units.jpg': { author: 'W.carter', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:New_glass_doors_and_windows_in_storage.jpg', title: 'New glass doors and windows in storage' },
    'assets/img/online/waterjet-head.jpg': { author: 'unknown author', license: 'Public domain', licenseUrl: '', source: 'https://commons.wikimedia.org/wiki/File:Water_jet_cutter_tool.jpg', title: 'Water jet cutter tool' },
    'assets/img/online/sealant-bead.jpg': { author: 'Achim Hering', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', source: 'https://commons.wikimedia.org/wiki/File:Caulking.jpg', title: 'Caulking' },
  };

  /* ---------- categories ---------- */
  const CATEGORIES = [
    {
      id: 'handling',
      name: 'Handling & Storage',
      short: 'Handling',
      color: '#14B8A6',
      blurb: 'Racks, shelves, pads and slings that protect glass from the truck to the cutting table.',
      covers: ['removable-shelf', 'cork-pads', 'glass-sling'],
      icon: '<path d="M12 4 6 20M12 4l6 16M3 20h18M8.6 13.5h6.8"/>',
    },
    {
      id: 'ig',
      name: 'Insulating & Sealing',
      short: 'IG & sealing',
      color: '#4F7CFF',
      blurb: 'Spacers, desiccant, adhesives and tapes for insulating glass units built to last.',
      covers: ['aluminum-spacer', 'molecular-sieve', 'green-adhesive'],
      icon: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><rect x="7.5" y="7.5" width="9" height="9" rx="1"/><path d="M3.5 3.5l4 4M20.5 3.5l-4 4M3.5 20.5l4-4M20.5 20.5l-4-4"/>',
    },
    {
      id: 'films',
      name: 'Films & Interlayers',
      short: 'Films',
      color: '#8B5CF6',
      blurb: 'Laminating interlayers and mirror safety backing films for every application.',
      covers: ['eva-film', 'vinyl-cat2', 'vinyl-cat1'],
      icon: '<path d="M12 3 21 8 12 13 3 8z"/><path d="M3 12.5 12 17.5 21 12.5"/><path d="M3 16.5 12 21.5 21 16.5"/>',
    },
    {
      id: 'cutting',
      name: 'Cutting & Finishing',
      short: 'Cutting',
      color: '#F08A24',
      blurb: 'Waterjet systems, abrasives, grinding wheels and polishing compounds.',
      covers: ['water-jet', 'waterjet-abrasive', 'grinding-wheels'],
      icon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M6.3 17.7l1.8-1.8M15.9 8.1l1.8-1.8"/>',
    },
  ];

  /* ---------- products (order matches the original Accessories page) ----------
     photo   : the product photo from the current Sailing website
     specs   : typical values for reference; final specs are confirmed in each quote
     extra   : additional gallery images (caption shown under the image)
     related : ids of products shown under "Often ordered with"                      */
  const P = 'assets/img/products/';
  const PRODUCTS = [
    {
      id: 'cork-pads', cat: 'handling', name: 'Cork Pads',
      short: 'Separator pads that keep stacked glass from scratching in storage and transit.',
      desc: 'Cork separator pads go between glass sheets so stacked lites never touch. The cork cushions each sheet, absorbs road vibration and keeps faces free of scratches and chips. Pads come on rolls or sheets of release film for fast, one-handed application.',
      uses: ['Stacking cut sizes and IG units', 'Crating and shipping finished glass', 'Protecting coated and mirror surfaces'],
      options: ['Pad diameter and thickness', 'Cork only or cork + foam', 'With or without adhesive', 'Roll or sheet format'],
      specs: [['Material', 'Natural cork; cork + foam available'], ['Pad size', '15–25 mm, square or round'], ['Thickness', '3–5 mm'], ['Format', 'Rolls or sheets on release film'], ['Fixing', 'Static-cling foam or adhesive backing']],
      tags: ['Anti-scratch', 'Custom sizes'],
      related: ['custom-rack', 'al-stock-shelf', 'removable-shelf'],
      extra: [],
    },
    {
      id: 'removable-shelf', cat: 'handling', name: 'Removable Storage Glass Shelf',
      short: 'Mobile, demountable shelving that reconfigures as your inventory changes.',
      desc: 'A mobile storage shelf for cut sizes, remakes and offcuts. Dividers can be removed or repositioned, so the rack adapts to whatever is on your floor this week, and casters let you roll glass straight to the next station. Padded contact points protect edges and coated surfaces.',
      uses: ['Cut-size and remake storage', 'Moving glass between stations', 'Staging glass between processes'],
      options: ['Overall dimensions', 'Number of bays and dividers', 'Mobile (casters) or fixed', 'Rubber or felt padding'],
      specs: [['Frame', 'Welded steel, painted or powder-coated'], ['Dividers', 'Removable and repositionable'], ['Mobility', 'Swivel casters (lockable) or fixed feet'], ['Padding', 'Rubber or felt on contact surfaces'], ['Size', 'Built to your floor space and glass sizes']],
      tags: ['On casters', 'Modular'],
      related: ['custom-rack', 'al-stock-shelf', 'cork-pads'],
      extra: [],
    },
    {
      id: 'custom-rack', cat: 'handling', name: 'Customized Glass Rack',
      short: 'Steel racks built to your glass sizes, loads and floor plan.',
      desc: 'When standard racks do not fit, we build to your drawing. Customized glass racks are fabricated in steel to your dimensions and load requirements (A-frame, L-frame, harp or transport styles), with protective padding wherever glass makes contact and tie-down straps to secure the load.',
      uses: ['Shop-floor storage', 'Truck and trailer transport', 'Jobsite delivery and staging'],
      options: ['A-frame, L-frame, harp or transport style', 'Dimensions and load capacity', 'Forklift pockets, lifting points or casters', 'Padding, straps and finish'],
      specs: [['Styles', 'A-frame, L-frame, harp, transport'], ['Frame', 'Welded steel, painted or powder-coated'], ['Load capacity', 'Engineered to your requirement'], ['Handling', 'Forklift pockets, lifting lugs or casters'], ['Securing', 'Rubber padding and tie-down straps']],
      tags: ['Built to drawing', 'Transport ready'],
      related: ['al-stock-shelf', 'glass-sling', 'cork-pads'],
      extra: [{ src: 'assets/img/online/window-units.jpg', caption: 'In use: finished doors and windows stored on racks' }],
    },
    {
      id: 'al-stock-shelf', cat: 'handling', name: 'AL-Type Sheet Glass Stock Shelf',
      short: 'Heavy-duty A- and L-frame racks for storing jumbo and full-size stock sheets.',
      desc: 'AL-type stock shelves hold full-size and jumbo sheet glass at a safe lean angle. The A-type is double-sided for maximum capacity, and the L-type stands against a wall and loads from one side. Both are padded with rubber to protect glass edges and faces.',
      uses: ['Jumbo and full-size stock storage', 'Feeding cutting tables', 'Warehouse inventory'],
      options: ['A-type (double-sided) or L-type (single-sided)', 'Length, height and number of bays', 'Load capacity', 'Rubber padding'],
      specs: [['Types', 'A-type (two-sided) or L-type (one-sided)'], ['Frame', 'Welded steel, painted'], ['Lean', 'Slight back-lean for safe storage'], ['Padding', 'Rubber on base and uprights'], ['Size', 'Built for jumbo or full-size sheets']],
      tags: ['A & L types', 'Heavy duty'],
      related: ['custom-rack', 'glass-sling', 'removable-shelf'],
      extra: [],
    },
    {
      id: 'glass-sling', cat: 'handling', name: 'Glass Sling',
      short: 'Lifting slings for safely moving glass crates and bundles by crane.',
      desc: 'Glass slings let you lift crates, packs and bundles with an overhead crane or forklift attachment. Made from high-strength webbing with reinforced eyes, they cradle the load evenly and reduce point pressure on glass edges. Slings are colour-coded so the working load limit is clear at a glance.',
      uses: ['Unloading containers and trucks', 'Moving packs to cutting lines', 'Jobsite hoisting'],
      options: ['Working load limit', 'Length and width', 'Eye type', 'Single or paired slings'],
      specs: [['Material', 'High-strength polyester webbing'], ['Capacity', 'Colour-coded by working load limit'], ['Length', 'To your requirement'], ['Ends', 'Flat or reinforced eyes'], ['Use with', 'Overhead cranes and forklift attachments']],
      tags: ['Crane lifting', 'Colour-coded'],
      related: ['custom-rack', 'al-stock-shelf', 'cork-pads'],
      extra: [],
    },
    {
      id: 'eva-film', cat: 'films', name: 'EVA Film',
      short: 'Ethylene-vinyl acetate interlayer for clear and decorative laminated glass.',
      desc: 'EVA film bonds two or more glass layers into laminated safety glass. It offers strong adhesion, good moisture resistance and high clarity, and it lets you laminate fabrics, meshes and prints between glass for decorative work. EVA is typically processed in a vacuum laminating oven.',
      uses: ['Laminated safety glass', 'Decorative glass with fabrics or prints', 'Partitions, railings and canopies'],
      options: ['Thickness', 'Roll width and length', 'Clear, ultra-clear, white or colored', 'Frosted and opaque finishes'],
      specs: [['Material', 'Ethylene-vinyl acetate (EVA)'], ['Thickness', '0.38, 0.50 or 0.76 mm'], ['Width', 'Up to about 2,500 mm'], ['Finishes', 'Clear, ultra-clear, white, frosted, colored'], ['Processing', 'Vacuum laminating oven']],
      tags: ['Laminating', 'Decorative'],
      related: ['grinding-wheels', 'water-jet', 'cerium-dioxide'],
      extra: [{ src: 'assets/img/glass/laminated.jpg', caption: 'Result: laminated safety glass' }],
    },
    {
      id: 'aluminum-spacer', cat: 'ig', name: 'Aluminum Spacer',
      short: 'Hollow aluminum spacer bar that holds the gap in insulating glass units.',
      desc: 'The aluminum spacer sets and holds the cavity between panes in an insulating glass unit. Its hollow, perforated profile is filled with molecular sieve, which draws moisture out of the sealed air space through the breather holes. Bendable and cut-and-corner-key versions are available.',
      uses: ['Double and triple glazed IG units', 'Windows, curtain wall and storefronts', 'Refrigerated display doors'],
      options: ['Width (cavity size)', 'Bendable or cut with corner keys', 'Mill or anodized finish', 'Bar length'],
      specs: [['Material', 'Aluminum, mill or anodized'], ['Width', '6–24 mm cavity'], ['Profile', 'Hollow, with breather perforations'], ['Corners', 'Bendable, or cut with corner keys'], ['Filled with', 'Molecular sieve desiccant']],
      tags: ['IG units', 'Bendable'],
      related: ['molecular-sieve', 'silicone-adhesive', 'green-adhesive'],
      extra: [{ src: 'assets/img/glass/insulated.jpg', caption: 'Result: a finished insulating glass unit' }],
    },
    {
      id: 'green-adhesive', cat: 'ig', name: 'High Temperature Green Adhesive',
      short: 'Heat-resistant green tape that masks cleanly and peels off without residue.',
      desc: 'A heat-resistant green polyester tape with a silicone adhesive. It holds up to oven and curing temperatures, masks crisp edges during coating, and peels off cleanly without leaving residue on glass or metal.',
      uses: ['Masking during coating and curing', 'Holding parts during heat processes', 'Protecting edges and finished surfaces'],
      options: ['Width and roll length', 'Thickness', 'Die-cut shapes and dots'],
      specs: [['Backing', 'Green polyester (PET) film'], ['Adhesive', 'Silicone'], ['Heat resistance', 'Up to about 200 °C'], ['Removal', 'Clean, residue-free'], ['Formats', 'Rolls, die-cut dots and shapes']],
      tags: ['Heat resistant', 'Clean removal'],
      related: ['aluminum-spacer', 'silicone-adhesive', 'eva-film'],
      extra: [],
    },
    {
      id: 'silicone-adhesive', cat: 'ig', name: 'Silicone Adhesive',
      short: 'Weather-resistant silicone for IG secondary sealing and glazing.',
      desc: 'Silicone adhesive gives a durable, flexible bond that resists UV, moisture and temperature swings. It is used as the secondary seal in insulating glass units and for structural and weather-seal glazing, where long-term adhesion to glass and aluminum is essential.',
      uses: ['IG secondary sealing', 'Structural and weather-seal glazing', 'Shower, mirror and interior glass bonding'],
      options: ['One- or two-component', 'Cartridge, sausage or drum', 'Black, grey, white or clear', 'Neutral cure'],
      specs: [['Chemistry', 'Neutral-cure silicone'], ['Types', 'One- or two-component'], ['Packaging', 'Cartridges, sausages or drums'], ['Colours', 'Black, grey, white or clear'], ['Resists', 'UV, moisture and temperature cycling']],
      tags: ['UV stable', 'IG & glazing'],
      related: ['aluminum-spacer', 'molecular-sieve', 'green-adhesive'],
      extra: [{ src: 'assets/img/online/sealant-bead.jpg', caption: 'Sealant extruded from a cartridge' }, { src: 'assets/img/glass/insulated.jpg', caption: 'Secondary seal around an IG unit' }],
    },
    {
      id: 'molecular-sieve', cat: 'ig', name: 'Molecular Sieve',
      short: '3A desiccant beads that keep insulating glass dry and fog-free.',
      desc: 'Molecular sieve is a crystalline desiccant that fills the hollow spacer bar. Its uniform pores capture water vapour from the sealed air space while leaving larger gas molecules alone, keeping the unit dry for its service life and preventing internal fogging.',
      uses: ['Filling aluminum and warm-edge spacers', 'Gas-filled (argon) IG units', 'Moisture control in sealed assemblies'],
      options: ['Bead size', 'Drums or bags', 'Blends for gas-filled units'],
      specs: [['Type', 'Zeolite 3A molecular sieve'], ['Bead size', '0.5–0.9 mm or 1.0–1.5 mm'], ['Function', 'Absorbs moisture inside the sealed unit'], ['Suits', 'Air- and argon-filled IG units'], ['Packaging', 'Drums or bags']],
      tags: ['3A type', 'Anti-fog'],
      related: ['aluminum-spacer', 'silicone-adhesive', 'cork-pads'],
      extra: [{ src: 'assets/img/glass/insulated.jpg', caption: 'Keeps IG units dry and clear inside' }],
    },
    {
      id: 'water-jet', cat: 'cutting', name: 'Water Jet',
      short: 'Abrasive waterjet systems for cold-cutting complex shapes in glass.',
      desc: 'A waterjet cuts glass with an ultra-high-pressure stream of water and abrasive. Because it is a cold process there is no heat-affected zone, so it can cut intricate curves, holes and notches in glass (and in stone, metal and tile) with minimal chipping.',
      uses: ['Shaped glass, holes and notches', 'Shower door and hardware cut-outs', 'Stone, tile and metal parts'],
      options: ['Table size', 'Pump pressure and power', '3-axis or 5-axis head', 'Control software'],
      specs: [['Process', 'Abrasive waterjet, cold cutting'], ['Pressure', 'Ultra-high, typically 380–420 MPa'], ['Cutting head', '3-axis or 5-axis'], ['Table size', 'To your requirement'], ['Materials', 'Glass, stone, tile and metal']],
      tags: ['Cold cutting', 'Complex shapes'],
      related: ['waterjet-abrasive', 'grinding-wheels', 'cerium-dioxide'],
      extra: [{ src: 'assets/img/online/waterjet-head.jpg', caption: 'A waterjet head cutting a part' }],
    },
    {
      id: 'waterjet-abrasive', cat: 'cutting', name: 'Water Jet Cutting Abrasive',
      short: 'Hard, sharp garnet abrasive for fast, clean waterjet cuts.',
      desc: 'Garnet is the standard abrasive for waterjet cutting. Its hardness and sharp grain edges speed up cutting while keeping nozzle wear low, and consistent grading gives a smooth, even edge on glass and other materials.',
      uses: ['Waterjet cutting of glass', 'Stone, ceramic and metal cutting', 'Surface blasting'],
      options: ['Mesh size', 'Bag or bulk-bag packaging', 'Grade'],
      specs: [['Material', 'Garnet'], ['Mesh', '80 mesh standard; others on request'], ['Hardness', 'About 7–8 on the Mohs scale'], ['Packaging', 'Bags or bulk bags'], ['Use with', 'Abrasive waterjet systems']],
      tags: ['Garnet', '80 mesh'],
      related: ['water-jet', 'grinding-wheels', 'cerium-dioxide'],
      extra: [{ src: 'assets/img/online/waterjet-head.jpg', caption: 'Abrasive is mixed into the jet at the cutting head' }],
    },
    {
      id: 'grinding-wheels', cat: 'cutting', name: 'Grinding Wheels',
      short: 'Diamond, resin and polishing wheels for edging and bevelling.',
      desc: 'Diamond and resin-bond grinding wheels for straight-line and shape edgers, bevellers and CNC centres. Coarse diamond wheels remove material fast, and resin and polishing wheels bring the edge to a smooth, bright finish.',
      uses: ['Flat and pencil edging', 'Bevelling and mitring', 'CNC edge processing'],
      options: ['Cup, peripheral or CNC wheels', 'Diameter and bore', 'Grit and bond', 'Edge profile'],
      specs: [['Types', 'Diamond cup, peripheral, resin polishing'], ['Diameter', 'About 100–200 mm'], ['Grits', 'Coarse diamond to fine polishing'], ['Profiles', 'Flat, pencil, bevel and more'], ['Machines', 'Edgers, bevellers and CNC centres']],
      tags: ['Diamond', 'Polishing'],
      related: ['cerium-dioxide', 'water-jet', 'waterjet-abrasive'],
      extra: [{ src: 'assets/img/glass/low-iron.jpg', caption: 'Result: clean, polished edges' }],
    },
    {
      id: 'cerium-dioxide', cat: 'cutting', name: 'Cerium Dioxide',
      short: 'Cerium oxide polishing powder for crystal-clear glass edges and surfaces.',
      desc: 'Cerium dioxide (cerium oxide) is the go-to polishing compound for glass. Mixed into a slurry and used with a felt or polishing wheel, it removes fine scratches and haze and gives edges and surfaces a high-clarity finish.',
      uses: ['Final polishing on edging lines', 'Scratch and haze removal', 'Optical and mirror glass finishing'],
      options: ['Particle size', 'Purity grade', 'Packaging'],
      specs: [['Chemical', 'Cerium oxide (CeO₂)'], ['Particle size', 'About 1–3 µm'], ['Form', 'Fine powder, mixed into a slurry'], ['Use with', 'Felt and polishing wheels'], ['Packaging', 'Bags or drums']],
      tags: ['CeO₂', 'High clarity'],
      related: ['grinding-wheels', 'water-jet', 'vinyl-cat1'],
      extra: [{ src: 'assets/img/glass/low-iron.jpg', caption: 'Result: crystal-clear polished edges' }],
    },
    {
      id: 'vinyl-cat1', cat: 'films', name: 'Vinyl Backed Film CAT I',
      short: 'Safety backing film for mirrors that call for a Category I impact rating.',
      desc: 'Vinyl-backed safety film is applied to the back of mirrors so that, if the glass breaks, the fragments stay bonded to the film instead of falling. Category I film is used where a Category I impact rating is specified, typically smaller mirrors and panels.',
      uses: ['Wall and vanity mirrors', 'Furniture and cabinet mirrors', 'Smaller decorative panels'],
      options: ['Roll width and length', 'Adhesive type', 'White or grey vinyl'],
      specs: [['Rating', 'Category I impact'], ['Construction', 'Vinyl film with pressure-sensitive adhesive'], ['Applied to', 'Back of silvered mirrors'], ['Colour', 'White or grey'], ['Supply', 'Rolls in common widths']],
      tags: ['Category I', 'Mirror safety'],
      related: ['vinyl-cat2', 'grinding-wheels', 'cerium-dioxide'],
      extra: [{ src: 'assets/img/glass/mirror.jpg', caption: 'Applied to the back of wall mirrors' }],
    },
    {
      id: 'vinyl-cat2', cat: 'films', name: 'Vinyl Backed Film CAT II',
      short: 'Heavier-duty mirror backing film for Category II impact applications.',
      desc: 'Category II vinyl-backed film is made for larger mirrors and higher-risk locations such as closet and sliding doors, gyms and studios, where a Category II impact rating is required. It holds broken glass together and reduces the risk of injury.',
      uses: ['Mirrored closet and sliding doors', 'Gym, dance and studio mirrors', 'Large wall mirrors'],
      options: ['Roll width and length', 'Adhesive type', 'White or grey vinyl'],
      specs: [['Rating', 'Category II impact'], ['Construction', 'Reinforced vinyl film with adhesive'], ['Applied to', 'Back of large and door mirrors'], ['Colour', 'White or grey'], ['Supply', 'Rolls in common widths']],
      tags: ['Category II', 'Gym mirrors'],
      related: ['vinyl-cat1', 'grinding-wheels', 'cork-pads'],
      extra: [{ src: 'assets/img/site/bg3-min.jpg', caption: 'Large mirror installations' }],
    },
  ];

  /* ---------- applications: browse accessories by where they are used ---------- */
  const APPLICATIONS = [
    {
      id: 'facades', name: 'Curtain walls & storefronts', img: 'assets/img/online/curtain-wall.jpg',
      text: 'Commercial facades rely on insulating glass units with precise spacers, desiccant and long-life sealants.',
      long: 'Curtain walls and storefronts are built from insulating glass units that have to stay sealed and clear for decades. That starts with the right spacer, desiccant and silicone, and with lifting gear that moves large lites safely on site.',
      products: ['aluminum-spacer', 'molecular-sieve', 'silicone-adhesive', 'glass-sling'],
    },
    {
      id: 'windows', name: 'Windows & IG units', img: 'assets/img/online/window-units.jpg',
      text: 'From the IG line to the delivery truck: build, protect and move finished units safely.',
      long: 'Window and door makers assemble IG units on the line, then protect and ship them. Spacers, molecular sieve and heat-resistant tape go into the unit; cork pads and racks keep finished units safe on the way out.',
      products: ['aluminum-spacer', 'molecular-sieve', 'green-adhesive', 'cork-pads', 'custom-rack'],
    },
    {
      id: 'showers', name: 'Showers & bathrooms', img: 'assets/img/site/bg1-min3.jpg',
      text: 'Shower panels need clean cut-outs, smooth edges, polished finishes and a reliable seal.',
      long: 'Frameless showers and bathroom glass need precise cut-outs for hinges and handles, smooth polished edges and a clean seal. Waterjet cutting, grinding wheels and cerium oxide deliver the finish, and silicone completes the install.',
      products: ['water-jet', 'waterjet-abrasive', 'grinding-wheels', 'cerium-dioxide', 'silicone-adhesive'],
    },
    {
      id: 'mirrors', name: 'Mirrors & gyms', img: 'assets/img/site/bg3-min.jpg',
      text: 'Mirrors in homes, gyms and studios call for safety backing and flawless edges.',
      long: 'Mirrors in homes, gyms, studios and on closet doors need safety backing that holds the glass together if it breaks, rated Category I or Category II depending on size and location, plus well-finished edges.',
      products: ['vinyl-cat1', 'vinyl-cat2', 'grinding-wheels', 'cerium-dioxide'],
    },
    {
      id: 'railings', name: 'Railings & balconies', img: 'assets/img/site/bg1-min2.jpg',
      text: 'Laminated glass guards and balustrades start with a dependable interlayer and good edgework.',
      long: 'Glass railings, balustrades and canopies use laminated safety glass. EVA interlayer bonds the lites, while waterjet cutting and edge grinding prepare holes, notches and exposed edges.',
      products: ['eva-film', 'water-jet', 'grinding-wheels'],
    },
    {
      id: 'interiors', name: 'Offices & interiors', img: 'assets/img/site/bg3-min2.jpg',
      text: 'Partitions and interior glazing are stored, moved and installed with care.',
      long: 'Office partitions, doors and interior glazing move through storage, transport and installation many times. Mobile shelves, stock racks and slings protect large lites at every step.',
      products: ['eva-film', 'removable-shelf', 'al-stock-shelf', 'glass-sling'],
    },
  ];

  /* ---------- glass products (from the current Products page) ----------
     facts : short key points shown as chips
     uses  : typical applications
     pairs : accessories often ordered with this glass                      */
  const G = 'assets/img/glass/';
  const GLASS = [
    { id: 'glass-insulated', name: 'Insulated Glass', photo: G + 'insulated.jpg', text: 'Two or more lites sealed around an air- or gas-filled space for thermal and sound insulation.', facts: ['Double or triple glazed', 'Air or argon fill', 'Combine with Low-E, tempered or laminated lites'], uses: ['Windows and doors', 'Curtain walls and storefronts', 'Skylights'], pairs: ['aluminum-spacer', 'molecular-sieve', 'silicone-adhesive'] },
    { id: 'glass-laminated', name: 'Laminated Glass', photo: G + 'laminated.jpg', text: 'Glass layers bonded with an interlayer that holds the pieces together if the glass breaks.', facts: ['PVB or EVA interlayer', 'Stays in place when broken', 'Cuts UV and noise'], uses: ['Railings and balustrades', 'Skylights and canopies', 'Storefronts and security glazing'], pairs: ['eva-film', 'water-jet', 'grinding-wheels'] },
    { id: 'glass-tempered', name: 'Tempered Glass', photo: G + 'tempered.jpg', text: 'Heat-treated safety glass, much stronger than ordinary glass. Available 3–19 mm thick.', facts: ['3–19 mm thick', 'Several times stronger than annealed', 'Breaks into small, blunt pieces'], uses: ['Shower doors and enclosures', 'Doors, sidelites and railings', 'Table tops and shelves'], pairs: ['water-jet', 'grinding-wheels', 'cerium-dioxide'] },
    { id: 'glass-mirror', name: 'Mirror', photo: G + 'mirror.jpg', text: 'Silvered glass for bathrooms, gyms, furniture and décor, with safety backing available.', facts: ['Silvered glass', 'CAT I or CAT II safety backing', 'Polished or bevelled edges'], uses: ['Bathrooms and vanities', 'Gyms, studios and closet doors', 'Furniture and décor'], pairs: ['vinyl-cat1', 'vinyl-cat2', 'grinding-wheels'] },
    { id: 'glass-patterned', name: 'Patterned Glass', photo: G + 'patterned.jpg', text: 'Textured glass that lets light through while adding privacy and decoration.', facts: ['Many textures', 'Lets light through, blurs the view', 'Can be tempered'], uses: ['Bathrooms and showers', 'Doors and partitions', 'Cabinets and furniture'], pairs: ['water-jet', 'grinding-wheels', 'cork-pads'] },
    { id: 'glass-coated', name: 'Coated Glass', photo: G + 'coated.jpg', text: 'Glass with coatings that control heat, glare and appearance.', facts: ['Low-E and reflective coatings', 'Controls heat and glare', 'Usually built into IG units'], uses: ['Energy-efficient windows', 'Facades and curtain walls', 'Solar control glazing'], pairs: ['aluminum-spacer', 'molecular-sieve', 'cork-pads'] },
    { id: 'glass-tinted', name: 'Tinted Float', photo: G + 'tinted-float.jpg', text: 'Body-tinted glass in a choice of colours to cut glare and solar heat.', facts: ['Multiple colour choices', 'Reduces glare', 'Lowers solar heat gain'], uses: ['Facades and storefronts', 'Automotive glass', 'Decorative glazing'], pairs: ['custom-rack', 'grinding-wheels', 'cork-pads'] },
    { id: 'glass-low-iron', name: 'Low Iron Glass', photo: G + 'low-iron.jpg', text: 'Ultra-clear glass with high light transmittance and no green edge tint.', facts: ['High light transmittance', 'No green edge tint', 'True colour rendering'], uses: ['Frameless showers', 'Display cases and shelving', 'Photovoltaic panels'], pairs: ['cerium-dioxide', 'grinding-wheels', 'eva-film'] },
    { id: 'glass-clear', name: 'Clear Float Glass', photo: G + 'clear-float.jpg', text: 'Standard flat glass: the starting point for cutting, tempering, laminating and IG.', facts: ['Standard flat glass', 'Base for further processing', 'Range of thicknesses'], uses: ['Windows and picture frames', 'Tempering and laminating', 'Insulating glass units'], pairs: ['al-stock-shelf', 'custom-rack', 'glass-sling'] },
  ];

  PRODUCTS.forEach((p) => {
    p.svg = wrap(ILLO[p.id]());
    p.photo = P + p.id + '.jpg';
    p.apps = APPLICATIONS.filter((a) => a.products.includes(p.id)).map((a) => a.id);
  });

  window.SIT_DATA = { CATEGORIES, PRODUCTS, APPLICATIONS, GLASS, CREDITS };
})();
