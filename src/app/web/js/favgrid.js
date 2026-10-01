// PlayLoop — favgrid.js
/* ---------- Favoritos: grade de cards redimensionáveis, com páginas na horizontal ---------- */
let favGridDim = '4x12';            // linhas x colunas (Configuração → Favoritos)
const fg = { items: [], place: [], pages: 1, page: 0, sel: 0 };
let fgInfoOpen = false;
const fgDim = () => { const [r, c] = (favGridDim || '4x12').split('x').map(Number); return { R: r || 4, C: c || 12 }; };
const fgSize = g => { const v = covers['fsz|' + coverKey(g)]; if (!v) return { w: 1, h: 1 }; const [w, h] = v.split(',').map(Number); const { R, C } = fgDim(); return { w: Math.max(1, Math.min(4, C, w || 1)), h: Math.max(1, Math.min(4, R, h || 1)) }; };

// posição escolhida pelo usuário (arrastando): 'fpos|chave' = "página,coluna,linha"
const fgPos = g => { const v = covers['fpos|' + coverKey(g)]; if (!v) return null; const [p, x, y] = v.split(',').map(Number); return { p, x, y }; };
let fgJournal = null;   // durante a prévia, guarda os valores antigos para desfazer
function fgSetPos(g, pos) {
  const key = 'fpos|' + coverKey(g), val = pos ? `${pos.p},${pos.x},${pos.y}` : '';
  if (fgJournal) { if (!(key in fgJournal)) fgJournal[key] = covers[key]; if (val) covers[key] = val; else delete covers[key]; return; }
  if (val) covers[key] = val; else delete covers[key];
  api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url: val }) }).catch(() => {});
}
// solta o card i no lugar t; quem estava embaixo sai do caminho (vai para o próximo espaço livre)
function fgDropInto(i, t) {
  const pl = fg.place[i]; fgSetPos(fg.items[i], { p: t.p, x: t.x, y: t.y });
  const hit = [];
  fg.items.forEach((o, k) => { const q = fg.place[k]; if (k !== i && q && q.p === t.p && q.x < t.x + pl.w && q.x + q.w > t.x && q.y < t.y + pl.h && q.y + q.h > t.y) hit.push(o); });
  // 1 card no caminho: troca de lugar com o arrastado; vários: só esses vão para o primeiro espaço livre (os demais nunca se mexem)
  if (hit.length === 1) fgSetPos(hit[0], { p: pl.p, x: pl.x, y: pl.y }); else hit.forEach(o => fgSetPos(o, null));
}
// todos os cards ficam com lugar fixo: desfavoritar ou mover um card não mexe nos outros (só cards novos procuram espaço)
function fgPinAll() { fg.items.forEach((g, i) => { const q = fgPos(g), pl = fg.place[i]; if (pl && (!q || q.p !== pl.p || q.x !== pl.x || q.y !== pl.y)) fgSetPos(g, { p: pl.p, x: pl.x, y: pl.y }); }); }
// prévia: reorganiza os cards na tela como ficariam, sem salvar nada
function fgPreview(i, t) {
  const place0 = fg.place, pages0 = fg.pages;
  fgJournal = {}; fgDropInto(i, t); fgLayout();
  for (const k in fgJournal) { if (fgJournal[k] === undefined) delete covers[k]; else covers[k] = fgJournal[k]; }
  fgJournal = null;
  fgApplyDom(); fg.place = place0; fg.pages = pages0;
}
function fgApplyDom() {
  const tr = $('fgTrack');
  fg.place.forEach((pl, i) => {
    const el = tr.querySelector(`.fgcard[data-i="${i}"]`); if (!el || !pl) return;
    while (tr.children.length <= pl.p) fgAddPage();
    if (el.parentNode !== tr.children[pl.p]) tr.children[pl.p].appendChild(el);
    el.style.gridColumn = `${pl.x + 1} / span ${pl.w}`; el.style.gridRow = `${pl.y + 1} / span ${pl.h}`;
  });
}
// geometria da grade (células quadradas, centralizadas na página)
function fgCell() {
  const { R, C } = fgDim(), v = $('fgView').getBoundingClientRect(), gap = 20, pad = 36;   // pad: folga para a borda/brilho do card selecionado não ser cortada
  const cell = Math.max(20, Math.floor(Math.min((v.width - pad - gap * (C - 1)) / C, (v.height - pad - gap * (R - 1)) / R)));
  $('fgTrack').style.setProperty('--cell', cell + 'px');
}
function fgGeom(pg) {
  const { R, C } = fgDim(), r = pg.getBoundingClientRect(), gap = 20, cell = parseFloat(getComputedStyle($('fgTrack')).getPropertyValue('--cell')) || 100;
  return { ox: r.left + (r.width - (C * cell + (C - 1) * gap)) / 2, oy: r.top + (r.height - (R * cell + (R - 1) * gap)) / 2, pitch: cell + gap, cell, gap };
}
window.addEventListener('resize', () => { if (screen === 'favgrid') fgCell(); });
// 1º os cards com lugar fixo (arrastados), depois os demais no primeiro espaço livre (linha por linha); não coube → próxima página
function fgLayout() {
  const { R, C } = fgDim(), pages = [];
  const ensure = p => { while (pages.length <= p) pages.push(Array.from({ length: R }, () => Array(C).fill(false))); };
  const free = (p, x, y, w, h) => { if (x < 0 || y < 0 || x + w > C || y + h > R) return false; ensure(p); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (pages[p][j][i]) return false; return true; };
  const take = (p, x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pages[p][j][i] = true; return { p, x, y, w, h }; };
  fg.place = fg.items.map(() => null);
  fg.items.forEach((g, i) => { const s = fgSize(g), q = fgPos(g); if (q && q.p >= 0 && q.p < 50 && free(q.p, q.x, q.y, s.w, s.h)) fg.place[i] = take(q.p, q.x, q.y, s.w, s.h); });
  fg.items.forEach((g, i) => {
    if (fg.place[i]) return;
    const { w, h } = fgSize(g);
    for (let p = 0; !fg.place[i]; p++) for (let y = 0; y < R && !fg.place[i]; y++) for (let x = 0; x < C && !fg.place[i]; x++) if (free(p, x, y, w, h)) fg.place[i] = take(p, x, y, w, h);
  });
  // páginas que ficaram vazias (no meio ou no fim) somem: as seguintes "andam" uma posição
  const used = [...new Set(fg.place.filter(Boolean).map(q => q.p))].sort((a, b) => a - b), map = {};
  used.forEach((p, k) => map[p] = k);
  fg.place.forEach(q => { if (q) q.p = map[q.p]; });
  fg.pages = Math.max(1, used.length);
}
async function openFavGrid() {
  sfx('ok'); globalMode = false; favMode = false;
  show('favgrid'); history.replaceState(null, '', '#favoritos');
  $('fgTrack').innerHTML = '<div class="empty">Carregando...</div>';
  if (!allGames) {
    const lists = await Promise.all(allSystems.map(s => loadGames(s.id).catch(() => [])));
    allGames = [].concat(...lists).sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity:'base' }));
  }
  const keys = new Set(favKeys().map(k => k.slice(4)));
  fg.items = allGames.filter(g => keys.has(coverKey(g))).sort(nameCmp);
  shown = fg.items; fg.sel = Math.min(fg.sel, Math.max(0, fg.items.length - 1)); fg.page = 0; gIdx = fg.sel; if (fg.items[fg.sel]) sys = sysOf(fg.items[fg.sel]);
  renderFavGrid();
}
function renderFavGrid() {
  fgLayout(); fgPinAll(); fgCell(); fg.moving = null; fgMulti.clear();
  $('favgrid').classList.remove('arrange');
  const { R, C } = fgDim();
  if (!fg.items.length) { fgDetails(); $('fgTrack').innerHTML = '<div class="empty">Nenhum jogo favoritado ainda — use a ⭐ ao lado de um jogo.</div>'; $('fgDots').innerHTML = ''; return; }
  let html = '';
  for (let p = 0; p < fg.pages; p++) {
    html += `<div class="fgpage" style="grid-template-columns:repeat(${C},var(--cell));grid-template-rows:repeat(${R},var(--cell))">`;
    // espaços vazios (só aparecem ao mover/arrastar um card)
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) html += `<div class="fgempty" style="grid-column:${x + 1};grid-row:${y + 1}"></div>`;
    fg.place.forEach((pl, i) => {
      if (pl.p !== p) return;
      const g = fg.items[i];
      html += `<div class="fgcard${i === fg.sel ? ' sel' : ''}" data-i="${i}" style="grid-column:${pl.x + 1} / span ${pl.w};grid-row:${pl.y + 1} / span ${pl.h}">
        <div class="fgimg"></div><div class="fgname">${esc(dn(g))}</div>
        <button class="fgi" data-info title="Info (I)">i</button><span class="fgrz r" data-rz="r"></span><span class="fgrz b" data-rz="b"></span><span class="fgrz rb" data-rz="rb"></span></div>`;
    });
    html += '</div>';
  }
  $('fgTrack').innerHTML = html;
  $('fgDots').innerHTML = fg.pages > 1 ? Array.from({ length: fg.pages }, (_, p) => `<span class="${p === fg.page ? 'on' : ''}" data-p="${p}"></span>`).join('') : '';
  $('fgDots').querySelectorAll('[data-p]').forEach(d => d.onclick = () => fgPage(+d.dataset.p));
  fgPage(fg.place[fg.sel] ? fg.place[fg.sel].p : 0, true);
  $('fgTrack').querySelectorAll('.fgcard').forEach(el => { fgBind(el); fgArt(+el.dataset.i, el); });
  fgDetails();
}
// imagem do card: escolhida pelo usuário > (card largo) tela/fundo do jogo > capa
async function fgArt(i, el) {
  const g = fg.items[i], pl = fg.place[i], custom = covers['fimg|' + coverKey(g)];
  let url = custom;
  if (!url) { const a = cachedArt(g) || await resolveArt(g).catch(() => null); if (a) url = (pl.w > pl.h && a.snap) ? a.snap : a.box; }
  const im = el.querySelector('.fgimg');
  if (url) { im.style.backgroundImage = `url("${cp(url).replace(/"/g, '%22')}")`; el.classList.add('has'); el._url = url; fgApplyOfs(el, g); }
}
function fgPage(p, quiet) {
  fg.page = Math.max(0, Math.min(Math.max(fg.pages, $('fgTrack').querySelectorAll('.fgpage').length) - 1, p));
  $('fgTrack').style.transform = `translateX(-${fg.page * 100}%)`;
  $('fgDots').querySelectorAll('[data-p]').forEach(d => d.classList.toggle('on', +d.dataset.p === fg.page));
  if (!quiet) sfx('tick');
}
function fgSelect(i, quiet) {
  if (!fg.items[i]) return;
  fg.sel = i; gIdx = i; sys = sysOf(fg.items[i]);
  $('fgTrack').querySelectorAll('.fgcard').forEach(el => el.classList.toggle('sel', +el.dataset.i === i));
  if (fg.place[i].p !== fg.page) fgPage(fg.place[i].p, true);
  fgDetails();
  if (!quiet) sfx('tick');
}
// navegação pelas setas: card mais próximo na direção (passa de página nas laterais)
function fgMove(dir) {
  const cur = fg.place[fg.sel]; if (!cur) return;
  const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
  let best = -1, bd = 1e9;
  fg.place.forEach((pl, i) => {
    if (i === fg.sel || pl.p !== cur.p) return;
    const x = pl.x + pl.w / 2, y = pl.y + pl.h / 2, dx = x - cx, dy = y - cy;
    const ok = dir === 'left' ? pl.x + pl.w <= cur.x : dir === 'right' ? pl.x >= cur.x + cur.w : dir === 'up' ? pl.y + pl.h <= cur.y : pl.y >= cur.y + cur.h;
    if (!ok) return;
    const d = (dir === 'left' || dir === 'right') ? Math.abs(dx) + Math.abs(dy) * 2 : Math.abs(dy) + Math.abs(dx) * 2;
    if (d < bd) { bd = d; best = i; }
  });
  if (best < 0 && (dir === 'left' || dir === 'right')) {   // borda: vai para a página vizinha, no card mais perto da mesma altura
    const np = cur.p + (dir === 'right' ? 1 : -1);
    fg.place.forEach((pl, i) => { if (pl.p !== np) return; const d = Math.abs(pl.y + pl.h / 2 - cy) * 2 + (dir === 'right' ? pl.x : (fgDim().C - pl.x - pl.w)); if (d < bd) { bd = d; best = i; } });
  }
  if (best >= 0) fgSelect(best);
}
function fgBind(el) {
  const i = +el.dataset.i;
  el.querySelector('[data-info]').onclick = e => { e.stopPropagation(); fgSelect(i, true); fgInfo(true); };
  el.querySelector('[data-info]').onpointerdown = e => e.stopPropagation();
  el.onclick = e => {
    if (e.target.dataset.rz || el._dragged) { el._dragged = false; return; }
    if (e.ctrlKey) { fgToggleMulti(i); return; }          // Ctrl+clique: seleção em lote
    if (fgMulti.size) fgClearMulti();
    fgSelect(i);
  };
  el.onpointerdown = e => { if (e.button !== 0 || e.target.dataset.rz || e.ctrlKey) return; if (e.altKey) fgAltPan(e, el, i); else fgDragStart(e, el, i); };
  el.ondblclick = e => { if (e.target.dataset.rz) return; fgSelect(i, true); fgLaunch(); };
  el.oncontextmenu = e => { e.preventDefault(); fgSelect(i, true); fgCtx(e.clientX, e.clientY); };
  // redimensionar arrastando a lateral direita, a de baixo ou o canto (sempre grudando na grade, máx. 4x4)
  el.querySelectorAll('[data-rz]').forEach(h => h.onpointerdown = e => {
    e.preventDefault(); e.stopPropagation(); fgSelect(i, true);
    const { R, C } = fgDim(), pl = fg.place[i], G = fgGeom(el.parentNode);
    const cw = G.pitch, ch = G.pitch, mode = h.dataset.rz, sx = e.clientX, sy = e.clientY;
    let w = pl.w, hh = pl.h;
    h.setPointerCapture(e.pointerId); el.classList.add('rz');
    h.onpointermove = ev => {
      if (mode.includes('r')) w = Math.max(1, Math.min(4, C - pl.x, Math.round(pl.w + (ev.clientX - sx) / cw)));
      if (mode.includes('b')) hh = Math.max(1, Math.min(4, R - pl.y, Math.round(pl.h + (ev.clientY - sy) / ch)));
      el.style.gridColumn = `${pl.x + 1} / span ${w}`; el.style.gridRow = `${pl.y + 1} / span ${hh}`;
    };
    h.onpointerup = () => { h.onpointermove = h.onpointerup = null; el.classList.remove('rz'); fgResize(fg.items[i], w, hh); };
  });
}
function fgResize(g, w, h) {
  const i = fg.items.indexOf(g), pl = fg.place[i];
  if (pl) {   // mantém o card onde está; quem ficar por baixo vai para o próximo espaço livre
    const { C, R } = fgDim(), x = Math.min(pl.x, C - w), y = Math.min(pl.y, R - h);
    fgSetPos(g, { p: pl.p, x, y });
    fg.items.forEach((o, k) => { const q = fg.place[k]; if (k !== i && q && q.p === pl.p && q.x < x + w && q.x + q.w > x && q.y < y + h && q.y + q.h > y) fgSetPos(o, null); });
  }
  const key = 'fsz|' + coverKey(g), val = (w === 1 && h === 1) ? '' : `${w},${h}`;
  if (val) covers[key] = val; else delete covers[key];
  api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url: val }) }).catch(() => {});
  sfx('ok'); renderFavGrid();
}
// arrastar o card para qualquer lugar da grade (encostar na lateral da tela troca de página, inclusive para uma nova)
function fgDragStart(e, el, i) {
  const sx = e.clientX, sy = e.clientY, r0 = el.getBoundingClientRect(), pl = fg.place[i];
  let ghost = null, target = null, edgeT = 0, edgeDir = 0, last = e, prevKey = '', prevT = 0;
  const edge = () => {
    const v = $('fgView').getBoundingClientRect(), dir = last.clientX > v.right - 50 ? 1 : last.clientX < v.left + 50 ? -1 : 0;
    if (dir !== edgeDir) { edgeDir = dir; edgeT = performance.now(); }
    if (dir && performance.now() - edgeT > 550) {   // segurou na borda: muda de página (cria uma nova no fim, se precisar)
      const np = fg.page + dir;
      if (np >= 0) { if (np >= $('fgTrack').children.length) fgAddPage(); fg.pages = Math.max(fg.pages, np + 1); fgPage(np); setTimeout(aim, 380); }
      edgeT = performance.now();
    }
  };
  const tick = setInterval(() => { if (ghost) edge(); }, 120);
  const { R, C } = fgDim();
  const cellAt = (x, y) => {
    const pg = $('fgTrack').children[fg.page]; if (!pg) return null;
    const G = fgGeom(pg);
    const gx = Math.round((x - (sx - r0.left) - G.ox) / G.pitch), gy = Math.round((y - (sy - r0.top) - G.oy) / G.pitch);
    return { p: fg.page, x: Math.max(0, Math.min(C - pl.w, gx)), y: Math.max(0, Math.min(R - pl.h, gy)), G };
  };
  const move = ev => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
      fgSelect(i, true); el._dragged = true; el.classList.add('dragsrc'); $('favgrid').classList.add('arrange');
      ghost = el.cloneNode(true); ghost.className = el.className.replace('dragsrc', '') + ' sel fgghost'; ghost.style.cssText = `width:${r0.width}px;height:${r0.height}px;`; document.body.appendChild(ghost);
      $('fgView').insertAdjacentHTML('beforeend', '<div class="fgslot" id="fgSlot"></div>');
    }
    ghost.style.transform = `translate(${ev.clientX - (sx - r0.left)}px, ${ev.clientY - (sy - r0.top)}px)`;
    last = ev; edge(); aim();
  };
  function aim() {
    if (!ghost) return;
    const v = $('fgView').getBoundingClientRect();
    target = cellAt(last.clientX, last.clientY);
    const s = $('fgSlot');
    if (s && target) { const G = target.G; s.style.cssText = `left:${G.ox - v.left + target.x * G.pitch}px;top:${G.oy - v.top + target.y * G.pitch}px;width:${pl.w * G.pitch - G.gap}px;height:${pl.h * G.pitch - G.gap}px`; }
    // depois de um instante parado no mesmo lugar, mostra como os outros cards ficariam
    const key = target ? `${target.p},${target.x},${target.y}` : '';
    if (key !== prevKey) { prevKey = key; clearTimeout(prevT); if (target) { const t = target; prevT = setTimeout(() => { if (ghost) fgPreview(i, t); }, 260); } }
  }
  const up = () => {
    document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); clearInterval(tick); clearTimeout(prevT);
    if (!ghost) return;
    ghost.remove(); const s = $('fgSlot'); if (s) s.remove(); el.classList.remove('dragsrc'); $('favgrid').classList.remove('arrange');
    if (!target) return;
    fgDropInto(i, target); sfx('ok'); renderFavGrid();
  };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
}
function fgAddPage() { const { R, C } = fgDim(); $('fgTrack').insertAdjacentHTML('beforeend', `<div class="fgpage" style="grid-template-columns:repeat(${C},var(--cell));grid-template-rows:repeat(${R},var(--cell))"></div>`); }
// painel flutuante com os detalhes do jogo selecionado (arraste pelo topo; gruda no canto/centro de baixo mais próximo)
let fgDock = 'left'; try { fgDock = localStorage.getItem('fgDock') || 'left'; } catch (e) {}
// ícone genérico de teclado + mouse para jogos de PC (no estilo dos desenhos de controle)
const PC_CTRL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350"><g fill="none" stroke="#F4F4F4" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="40" y="110" width="390" height="190" rx="18"/><rect x="46" y="116" width="378" height="178" rx="14"/><rect x="58" y="130" width="24" height="26" rx="4"/><rect x="86" y="130" width="24" height="26" rx="4"/><rect x="114" y="130" width="24" height="26" rx="4"/><rect x="142" y="130" width="24" height="26" rx="4"/><rect x="170" y="130" width="24" height="26" rx="4"/><rect x="198" y="130" width="24" height="26" rx="4"/><rect x="226" y="130" width="24" height="26" rx="4"/><rect x="254" y="130" width="24" height="26" rx="4"/><rect x="282" y="130" width="24" height="26" rx="4"/><rect x="310" y="130" width="24" height="26" rx="4"/><rect x="338" y="130" width="24" height="26" rx="4"/><rect x="366" y="130" width="24" height="26" rx="4"/><rect x="394" y="130" width="24" height="26" rx="4"/><rect x="66" y="160" width="24" height="26" rx="4"/><rect x="94" y="160" width="24" height="26" rx="4"/><rect x="122" y="160" width="24" height="26" rx="4"/><rect x="150" y="160" width="24" height="26" rx="4"/><rect x="178" y="160" width="24" height="26" rx="4"/><rect x="206" y="160" width="24" height="26" rx="4"/><rect x="234" y="160" width="24" height="26" rx="4"/><rect x="262" y="160" width="24" height="26" rx="4"/><rect x="290" y="160" width="24" height="26" rx="4"/><rect x="318" y="160" width="24" height="26" rx="4"/><rect x="346" y="160" width="24" height="26" rx="4"/><rect x="374" y="160" width="24" height="26" rx="4"/><rect x="72" y="190" width="24" height="26" rx="4"/><rect x="100" y="190" width="24" height="26" rx="4"/><rect x="128" y="190" width="24" height="26" rx="4"/><rect x="156" y="190" width="24" height="26" rx="4"/><rect x="184" y="190" width="24" height="26" rx="4"/><rect x="212" y="190" width="24" height="26" rx="4"/><rect x="240" y="190" width="24" height="26" rx="4"/><rect x="268" y="190" width="24" height="26" rx="4"/><rect x="296" y="190" width="24" height="26" rx="4"/><rect x="324" y="190" width="24" height="26" rx="4"/><rect x="352" y="190" width="24" height="26" rx="4"/><rect x="78" y="220" width="24" height="26" rx="4"/><rect x="106" y="220" width="24" height="26" rx="4"/><rect x="134" y="220" width="24" height="26" rx="4"/><rect x="162" y="220" width="24" height="26" rx="4"/><rect x="190" y="220" width="24" height="26" rx="4"/><rect x="218" y="220" width="24" height="26" rx="4"/><rect x="246" y="220" width="24" height="26" rx="4"/><rect x="274" y="220" width="24" height="26" rx="4"/><rect x="302" y="220" width="24" height="26" rx="4"/><rect x="330" y="220" width="24" height="26" rx="4"/><rect x="58" y="250" width="52" height="26" rx="4"/><rect x="116" y="250" width="200" height="26" rx="4"/><rect x="322" y="250" width="52" height="26" rx="4"/><path d="M505 120c-38 0-62 26-62 66v58c0 40 26 64 62 64s62-24 62-64v-58c0-40-24-66-62-66z"/><path d="M443 196h124M505 120v76"/><rect x="498" y="140" width="14" height="30" rx="7"/><path d="M505 120c0-30-18-46-60-52"/></g></svg>`);
const ctrlImg = s => s.type === 'pc' || s.id === 'pc' ? PC_CTRL : `${ART}controllers/${s.art}.svg`;
// cabeçalho dos Favoritos = detalhes do card selecionado (controle do console, nome, console, tamanho e caminho)
function fgDetails() {
  const g = fg.items[fg.sel], d = $('fgHead'); if (!d) return;
  if (!g) { d.innerHTML === '' || (d.querySelector('.fdn').textContent = 'Favoritos'); d.querySelector('.fdc').textContent = ''; d.querySelector('.fdm').style.display = 'none'; d.querySelector('.fdctrl').style.display = 'none'; fgLogo(null); return; }
  const s = sysOf(g);
  d.querySelector('.fdm').style.display = '';
  d.querySelector('.fdn').textContent = dn(g);
  d.querySelector('.fdc').textContent = s.name || '';
  const ci = d.querySelector('.fdctrl'); ci.style.display = ''; ci.onerror = () => { ci.style.display = 'none'; };
  ci.src = ctrlImg(s);
  d.querySelector('.fdp').textContent = g.path; d.querySelector('.fdp').title = 'Abrir a pasta do arquivo';
  d.querySelector('.fds').textContent = fmtSize(g.size);
  fgGameBg(g);
  fgLogo(g);
}
// logo de título do jogo selecionado, no canto superior direito do cabeçalho
let fgLogoTok = 0;
async function fgLogo(g) {
  let im = $('fgLogo');
  if (!im) { im = document.createElement('img'); im.id = 'fgLogo'; im.alt = ''; $('fgHeader').appendChild(im); }
  const my = ++fgLogoTok; im.classList.remove('on');
  if (!g) return;
  const tries = [covers['logo|' + coverKey(g)]];
  const a = cachedArt(g) || await resolveArt(g).catch(() => null);
  if (my !== fgLogoTok) return;
  if (a) { tries.push(a.logo); if (a.box && /\/Named_Boxarts\//.test(a.box)) tries.push(a.box.replace('/Named_Boxarts/', '/Named_Logos/')); }
  for (const u of tries.filter(Boolean)) {
    const src = cp(u);
    if (await loadImg(src)) { if (my !== fgLogoTok) return; im.src = src; im.classList.add('on'); return; }
    if (my !== fgLogoTok) return;
  }
}
$('fgHead').querySelector('.fdp').onclick = () => { const g = fg.items[fg.sel]; if (g) api('/api/reveal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: g.path }) }).catch(er => toast(er.message, true)); };
// fundo da tela de favoritos = fundo do jogo selecionado (opcional, Configuração → Favoritos)
let favBgGame = false, fgBgTok = 0;
async function fgGameBg(g) {
  const host = $('fgBg'), tok = ++fgBgTok;
  if (!favBgGame || !g) { host.querySelectorAll('.bgl').forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 600); }); return; }
  const over = covers['bg|' + coverKey(g)];
  let url = over; if (!url) { const a = cachedArt(g) || await resolveArt(g).catch(() => null); if (a) url = a.snap || a.box; }
  if (tok !== fgBgTok || !url) return;
  const old = [...host.querySelectorAll('.bgl')];
  const l = document.createElement('div'); l.className = 'bgl'; l.style.backgroundImage = `url("${cp(url).replace(/"/g, '%22')}")`;
  host.appendChild(l); host._url = url; host._g = g; fgApplyBgOfs(l, url, g); if (!fgBgOfs(g)) fgBgExtend(l, url, tok); requestAnimationFrame(() => requestAnimationFrame(() => l.classList.add('on')));
  old.forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 600); });
}
// abrir o jogo: a imagem do card se expande até a tela inteira, escurece e mostra "Bom jogo."
let fxOpen = false;
let fxTimer = 0, fxAt = 0;
// animação de abertura: a imagem cresce de "rect" até a tela inteira (o app entra em tela cheia de verdade), escurece e mostra "Bom jogo.";
// o jogo abre depois da animação completa + 0,5 s
function playFx(rect, bgImage, bgPos, radius) {
  if (fxOpen) return;
  const fx = $('fgFx');
  clearTimeout(fxTimer); fxTimer = setTimeout(() => { if (fxOpen) launch(); }, 1400);
  if (window.chrome && chrome.webview) chrome.webview.postMessage('fxon');
  fx.style.backgroundImage = bgImage || ''; fx.style.backgroundPosition = bgPos || 'center';
  fx.className = 'fgfx'; Object.assign(fx.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', borderRadius: (radius || 0) + 'px' });
  fxOpen = true; fxAt = Date.now(); fx.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => { fx.classList.add('grow'); Object.assign(fx.style, { left: '0px', top: '0px', width: '100vw', height: '100vh', borderRadius: '0px' }); }));
}
function fgLaunch() {
  const g = fg.items[fg.sel], el = $('fgTrack').querySelector(`.fgcard[data-i="${fg.sel}"]`); if (!g || fxOpen) return;
  if (!el) { launch(); return; }
  const im = el.querySelector('.fgimg'), o = fgOfs(g);
  playFx(el.getBoundingClientRect(), im ? im.style.backgroundImage : '', o ? `${o.x}% ${o.y}%` : 'center', 12);
}
// lista de jogos dos consoles: parte do painel da capa, com o fundo do jogo (ou a capa)
function listLaunch() {
  const g = shown[gIdx]; if (!g || fxOpen) return;
  const right = document.querySelector('#games .right') || $('art'), a = cachedArt(g);
  const src = covers['bg|' + coverKey(g)] || (a && (a.snap || a.box)) || (lastArt && lastArt.g === g && lastArt.url);   // fundo do jogo > tela > capa
  let img = src ? `url("${cp(src).replace(/"/g, '%22')}")` : '';
  if (!img) { const bgl = [...$('gameBg').querySelectorAll('.bgl')].pop(); img = bgl ? bgl.style.backgroundImage : ''; }
  if (!img) { launch(); return; }
  playFx(right.getBoundingClientRect(), img, 'center', 10);
}
function fgFxClose() { clearTimeout(fxTimer); if (!fxOpen) return; fxOpen = false; const fx = $('fgFx'); fx.classList.add('out'); setTimeout(() => { fx.className = 'fgfx'; }, 350); if (window.chrome && chrome.webview) chrome.webview.postMessage('fxoff'); }
window.addEventListener('blur', () => { if (fxOpen && Date.now() - fxAt > 1300) fgFxClose(); });   // o jogo abriu (o foco saiu do app)
// ---- reposicionar a imagem do card: 'fofs|chave' = "posX%,posY%,zoom" ----
const fgBgOfs = g => { const v = covers['bofs|' + coverKey(g)]; if (!v) return null; const [x, y, z] = v.split(',').map(Number); return { x, y, z: z || 1 }; };
// fundo menor que a tela: mostra a imagem sem ampliar além do tamanho real e "estica" os últimos pixels de cada borda até o fim da área
async function fgBgExtend(l, url, tok) {
  const src = cp(url), im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  if (!im || tok !== fgBgTok) return;
  const W = l.offsetWidth || innerWidth, H = l.offsetHeight || innerHeight, iw = im.naturalWidth, ih = im.naturalHeight;
  const cover = Math.max(W / iw, H / ih), contain = Math.min(W / iw, H / ih), sc = Math.min(cover, Math.max(contain, 1));
  if (sc >= cover * .999) return;   // a imagem já cobre a tela toda
  try {
    const k = Math.min(1, 1920 / W), cw = Math.round(W * k), ch = Math.round(H * k), dw = iw * sc * k, dh = ih * sc * k, x0 = (cw - dw) / 2, y0 = (ch - dh) / 2;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d');
    x.drawImage(im, x0, y0, dw, dh);
    if (x0 > 0) { x.drawImage(im, 0, 0, 1, ih, 0, y0, Math.ceil(x0) + 1, dh); x.drawImage(im, iw - 1, 0, 1, ih, Math.floor(x0 + dw) - 1, y0, cw - Math.floor(x0 + dw) + 1, dh); }
    if (y0 > 0) { x.drawImage(cv, 0, Math.ceil(y0), cw, 1, 0, 0, cw, Math.ceil(y0) + 1); x.drawImage(cv, 0, Math.floor(y0 + dh) - 1, cw, 1, 0, Math.floor(y0 + dh) - 1, cw, ch - Math.floor(y0 + dh) + 1); }
    const data = cv.toDataURL('image/jpeg', .9);
    if (tok !== fgBgTok) return;
    l.style.backgroundImage = `url("${data}")`; l.style.backgroundSize = '100% 100%'; l.style.backgroundPosition = 'center';
  } catch (e) {}   // imagem sem permissão de leitura: fica como está
}
async function fgApplyBgOfs(l, url, g) {   // posição/zoom do fundo do jogo ('bofs|chave')
  const o = fgBgOfs(g);
  if (!o) { l.style.backgroundSize = ''; l.style.backgroundPosition = ''; return; }
  l.style.backgroundPosition = `${o.x}% ${o.y}%`;
  if (o.z === 1) { l.style.backgroundSize = 'cover'; return; }
  const d = await loadDims(url); if (!d) return;
  const W = l.offsetWidth || innerWidth, H = l.offsetHeight || innerHeight, sc = Math.max(W / d.w, H / d.h) * o.z;
  l.style.backgroundSize = `${d.w * sc}px ${d.h * sc}px`;
}
const fgOfs = g => { const v = covers['fofs|' + coverKey(g)]; if (!v) return null; const [x, y, z] = v.split(',').map(Number); return { x, y, z: z || 1 }; };
const imgDims = {};
const loadDims = url => imgDims[url] ? Promise.resolve(imgDims[url]) : new Promise(ok => { const i = new Image(); i.onload = () => ok(imgDims[url] = { w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => ok(null); i.src = cp(url); });
async function fgApplyOfs(el, g) {
  const o = fgOfs(g), im = el.querySelector('.fgimg');
  if (!o) { im.style.backgroundSize = ''; im.style.backgroundPosition = ''; return; }
  im.style.backgroundPosition = `${o.x}% ${o.y}%`;
  if (o.z === 1) { im.style.backgroundSize = 'cover'; return; }
  const d = await loadDims(el._url); if (!d) return;
  const W = im.offsetWidth, H = im.offsetHeight, s = Math.max(W / d.w, H / d.h) * o.z;
  im.style.backgroundSize = `${d.w * s}px ${d.h * s}px`;
}
const fp = { open: false };
async function fgBgPosOpen() {
  const g = fg.items[fg.sel], host = $('fgBg');
  if (!g || !favBgGame || host._g !== g || !host._url) { toast(favBgGame ? 'Este jogo ainda não tem fundo' : 'Ative "Fundo do jogo" em Configuração → Favoritos', true); return; }
  const d = await loadDims(host._url); if (!d) return;
  const o = fgBgOfs(g) || { x: 50, y: 50, z: 1 };
  Object.assign(fp, { open: true, kind: 'bg', g, el: null, url: host._url, d, x: o.x, y: o.y, z: o.z });
  const r = (host.offsetWidth || innerWidth) / (host.offsetHeight || innerHeight), maxW = innerWidth * .6, maxH = innerHeight * .6;
  fp.W = Math.min(maxW, maxH * r); fp.H = fp.W / r;
  $('fpFrame').style.width = fp.W + 'px'; $('fpFrame').style.height = fp.H + 'px';
  $('fpImg').src = cp(fp.url);
  $('fpModal').classList.add('on'); fpRender(); sfx('ok');
}
async function fgPosOpen() {
  const i = fg.sel, g = fg.items[i], el = $('fgTrack').querySelector(`.fgcard[data-i="${i}"]`); if (!g || !el || !el._url) { toast('Este card ainda não tem imagem', true); return; }
  const pl = fg.place[i], d = await loadDims(el._url); if (!d) return;
  const o = fgOfs(g) || { x: 50, y: 50, z: 1 };
  Object.assign(fp, { open: true, kind: 'card', g, el, url: el._url, d, x: o.x, y: o.y, z: o.z });
  // card simulado no centro, com a proporção real do card
  const maxW = innerWidth * .5, maxH = innerHeight * .55, r = pl.w / pl.h;
  fp.W = Math.min(maxW, maxH * r); fp.H = fp.W / r;
  $('fpFrame').style.width = fp.W + 'px'; $('fpFrame').style.height = fp.H + 'px';
  $('fpImg').src = cp(fp.url);
  $('fpModal').classList.add('on'); fpRender(); sfx('ok');
}
function fpRender() {
  const { d, W, H } = fp, s = Math.max(W / d.w, H / d.h) * fp.z, Dw = d.w * s, Dh = d.h * s;
  fp.Dw = Dw; fp.Dh = Dh;
  const f = $('fpFrame').getBoundingClientRect();
  const ox = (W - Dw) * fp.x / 100, oy = (H - Dh) * fp.y / 100;   // mesmo cálculo do background-position em %
  Object.assign($('fpImg').style, { width: Dw + 'px', height: Dh + 'px', left: (f.left + ox) + 'px', top: (f.top + oy) + 'px' });
  $('fpZoom').textContent = Math.round(fp.z * 100) + '%';
}
function fpPan(dx, dy) {   // dx/dy em pixels de tela
  const ex = fp.W - fp.Dw, ey = fp.H - fp.Dh;
  if (ex < 0) fp.x = Math.max(0, Math.min(100, fp.x + dx / ex * 100));
  if (ey < 0) fp.y = Math.max(0, Math.min(100, fp.y + dy / ey * 100));
  fpRender();
}
function fpZoom(f) { fp.z = Math.max(1, Math.min(4, fp.z * f)); fpRender(); }
function fpClose(save) {
  if (!fp.open) return;
  fp.open = false; $('fpModal').classList.remove('on');
  if (save) {
    const key = (fp.kind === 'bg' ? 'bofs|' : 'fofs|') + coverKey(fp.g), def = Math.abs(fp.x - 50) < .5 && Math.abs(fp.y - 50) < .5 && fp.z === 1;
    const val = def ? '' : `${fp.x.toFixed(1)},${fp.y.toFixed(1)},${fp.z.toFixed(3)}`;
    if (val) covers[key] = val; else delete covers[key];
    api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url: val }) }).catch(() => {});
    if (fp.kind === 'bg') { const l = [...$('fgBg').querySelectorAll('.bgl')].pop(); if (l) fgApplyBgOfs(l, fp.url, fp.g); toast('Posição do fundo salva'); }
    else { fgApplyOfs(fp.el, fp.g); toast('Posição da capa salva'); }
    sfx('ok');
  } else sfx('back');
}
function fpInput(a) {
  const st = 14;
  if (a === 'left') fpPan(-st, 0); else if (a === 'right') fpPan(st, 0); else if (a === 'up') fpPan(0, -st); else if (a === 'down') fpPan(0, st);
  else if (a === 'pgup') fpZoom(1 / 1.1); else if (a === 'pgdn') fpZoom(1.1);
  else if (a === 'ok' || a === 'fav') fpClose(true); else if (a === 'back' || a === 'menu') fpClose(false);
}
(() => {
  const m = $('fpModal'); let dr = null;
  m.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; dr = { x: e.clientX, y: e.clientY }; m.setPointerCapture(e.pointerId); m.classList.add('grab'); });
  m.addEventListener('pointermove', e => { if (!dr) return; fpPan(e.clientX - dr.x, e.clientY - dr.y); dr = { x: e.clientX, y: e.clientY }; });
  m.addEventListener('pointerup', () => { dr = null; m.classList.remove('grab'); });
  m.addEventListener('wheel', e => { e.preventDefault(); fpZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive:false });
  $('fpOk').onclick = () => fpClose(true); $('fpCancel').onclick = () => fpClose(false);
  $('fpReset').onclick = () => { fp.x = 50; fp.y = 50; fp.z = 1; fpRender(); };
  window.addEventListener('resize', () => { if (fp.open) fpRender(); });
})();
// Alt + arrastar: move só a imagem dentro do card (salva ao soltar)
async function fgAltPan(e, el, i) {
  e.preventDefault(); fgSelect(i, true);
  const g = fg.items[i], im = el.querySelector('.fgimg'); if (!el._url) return;
  const d = await loadDims(el._url); if (!d) return;
  const o = fgOfs(g) || { x: 50, y: 50, z: 1 }, W = im.offsetWidth, H = im.offsetHeight, s = Math.max(W / d.w, H / d.h) * o.z, ex = W - d.w * s, ey = H - d.h * s;
  let lx = e.clientX, ly = e.clientY; el.classList.add('alting'); el._dragged = true;
  const mv = ev => {
    if (ex < 0) o.x = Math.max(0, Math.min(100, o.x + (ev.clientX - lx) / ex * 100));
    if (ey < 0) o.y = Math.max(0, Math.min(100, o.y + (ev.clientY - ly) / ey * 100));
    lx = ev.clientX; ly = ev.clientY; im.style.backgroundPosition = `${o.x}% ${o.y}%`; if (o.z === 1) im.style.backgroundSize = 'cover';
  };
  const up = () => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); el.classList.remove('alting');
    const key = 'fofs|' + coverKey(g), val = `${o.x.toFixed(1)},${o.y.toFixed(1)},${o.z.toFixed(3)}`;
    covers[key] = val; api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url: val }) }).catch(() => {});
    setTimeout(() => { el._dragged = false; }, 0);
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
// seleção em lote (Ctrl + clique)
const fgMulti = new Set();
function fgMultiDom() { $('fgTrack').querySelectorAll('.fgcard').forEach(el => el.classList.toggle('msel', fgMulti.has(+el.dataset.i))); }
function fgToggleMulti(i) { if (!fgMulti.size && fg.sel !== i && fg.items[fg.sel]) fgMulti.add(fg.sel); if (fgMulti.has(i)) fgMulti.delete(i); else fgMulti.add(i); fgSelect(i, true); fgMultiDom(); sfx('tick'); }
function fgClearMulti() { fgMulti.clear(); fgMultiDom(); }
async function fgBatchUnfav() {
  const list = [...fgMulti].map(k => fg.items[k]).filter(Boolean);
  if (!await ask(`Desfavoritar ${list.length} jogos?`, 'Eles saem da tela de Favoritos (os jogos continuam no seu PC).', 'Desfavoritar')) return;
  for (const g of list) { delete covers['fav|' + coverKey(g)]; api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: 'fav|' + coverKey(g), url: '' }) }).catch(() => {}); }
  fgMulti.clear(); toast(`${list.length} jogos removidos dos favoritos`); sfx('back'); openFavGrid();
}
// menu de contexto do card (botão direito / △)
function fgCtx(x, y, sizes) {
  const g = fg.items[fg.sel]; if (!g) return;
  if (!x) { const r = $('fgTrack').querySelector('.fgcard.sel').getBoundingClientRect(); x = r.left + 20; y = r.top + 20; }
  const { R, C } = fgDim(), cur = fgSize(g);
  if (fgMulti.size > 1 && fgMulti.has(fg.sel) && !sizes) {
    ctxItems = [['star', `Desfavoritar ${fgMulti.size} jogos`, () => fgBatchUnfav(), 'red'], ['pen', 'Limpar seleção', () => fgClearMulti()]];
  } else if (sizes) {
    ctxItems = [['pen', '← Voltar', () => fgCtx(x, y)], null];
    for (let h = 1; h <= Math.min(4, R); h++) for (let w = 1; w <= Math.min(4, C); w++) ctxItems.push(['cover', `${w} × ${h}${w === cur.w && h === cur.h ? '  ✓' : ''}`, () => fgResize(g, w, h)]);
  } else ctxItems = [
    ['star', 'Desfavoritar', async () => { if (!await ask('Desfavoritar este jogo?', `"${dn(g)}" sai da tela de Favoritos (o jogo continua no seu PC).`, 'Desfavoritar')) return; await toggleFav(g); openFavGrid(); }],
    ['cover', 'Alterar imagem', () => openCover('card')],
    ['bg', 'Alterar fundo', () => openCover(true)],
    ['bg', 'Reposicionar capa', () => fgPosOpen()],
    ['bg', 'Reposicionar fundo', () => fgBgPosOpen()],
    ['bg', 'Redimensionar ▸', () => setTimeout(() => fgCtx(x, y, true), 0)],
    ['eye', 'Info', () => fgInfo(true)],
  ];
  const m = $('ctx');
  m.innerHTML = ctxItems.map((it, k) => it ? `<div class="ci ${it[3] || ''}" data-k="${k}">${ICO[it[0]]}${it[1]}</div>` : '<div class="sep"></div>').join('');
  m.querySelectorAll('.ci').forEach(el => el.onclick = e => { e.stopPropagation(); closeCtx(); ctxItems[+el.dataset.k][2](); });
  m.classList.add('on'); ctxSel = -1;
  m.style.maxHeight = (innerHeight - 20) + 'px'; m.style.overflowY = 'auto';
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  ctxMove(1);
}
// "Info": capa 3D, vídeo e dados do jogo num modal (reaproveita o painel da direita da lista)
function fgInfo(on) {
  const right = $('fgInfoBox').querySelector('.right') || document.querySelector('.right');
  if (on) {
    const g = fg.items[fg.sel]; if (!g) return;
    fgInfoOpen = true; $('fgInfo').classList.add('on'); $('fgInfoBox').appendChild(right);
    screen = 'games'; sys = sysOf(g); shown = fg.items; gIdx = -1;
    selectGame(fg.sel, true); sfx('ok');
  } else {
    if (!fgInfoOpen) return;
    stopVideo(); fgInfoOpen = false; $('fgInfo').classList.remove('on');
    document.querySelector('#games .body').appendChild(right);
    screen = 'favgrid'; sfx('back');
  }
}
$('fgInfo').onclick = e => { if (e.target === $('fgInfo')) fgInfo(false); };
$('fgiClose').onclick = () => fgInfo(false);
$('fgiPlay').onclick = () => { fgInfo(false); fgLaunch(); };
// mover com o controle: □ "levanta" o card, o D-pad leva célula por célula (passa de página nas laterais), □ de novo solta
function fgMoveMode() {
  const i = fg.sel, pl = fg.place[i]; if (!pl) return;
  if (!fg.moving) { fg.moving = { i, t: { p: pl.p, x: pl.x, y: pl.y } }; fgLift(); sfx('ok'); return; }
  const t = fg.moving.t; fg.moving = null; fgDropInto(i, t); sfx('ok'); renderFavGrid();
}
function fgLift() { $('favgrid').classList.add('arrange'); const el = $('fgTrack').querySelector(`.fgcard[data-i="${fg.moving.i}"]`); if (el) el.classList.add('lift'); }
function fgMoveStep(dir) {
  const m = fg.moving, pl = fg.place[m.i], t = m.t, { R, C } = fgDim();
  if (dir === 'up') t.y = Math.max(0, t.y - 1); else if (dir === 'down') t.y = Math.min(R - pl.h, t.y + 1);
  else if (dir === 'left') { if (t.x > 0) t.x--; else if (t.p > 0) { t.p--; t.x = C - pl.w; } }
  else if (dir === 'right') { if (t.x < C - pl.w) t.x++; else { t.p++; t.x = 0; } }
  fgPreview(m.i, t); fgLift(); if (t.p !== fg.page) fgPage(t.p, true); sfx('tick');
}
function fgInput(a) {
  if (fg.moving) {
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') return fgMoveStep(a);
    if (a === 'fav' || a === 'ok') return fgMoveMode();
    if (a === 'back') { fg.moving = null; sfx('back'); renderFavGrid(); return; }
    return;
  }
  if (a === 'left' || a === 'right' || a === 'up' || a === 'down') fgMove(a);
  else if (a === 'pgup') { fgPage(fg.page - 1); const i = fg.place.findIndex(p => p.p === fg.page); if (i >= 0) fgSelect(i, true); }
  else if (a === 'pgdn') { fgPage(fg.page + 1); const i = fg.place.findIndex(p => p.p === fg.page); if (i >= 0) fgSelect(i, true); }
  else if (a === 'ok') { if (fg.items[fg.sel]) fgLaunch(); }
  else if (a === 'menu') fgCtx();
  else if (a === 'fav') fgMoveMode();
  else if (a === 'back') { if (fgMulti.size) { fgClearMulti(); return; } fgInfo(false); back(); }
}
$('fgHome').onclick = () => { $('fgHome').blur(); back(); };
let fgWheelT = 0;
$('favgrid').addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.fgdet')) return; if (screen !== 'favgrid') return; if (Date.now() - fgWheelT < 350) { e.preventDefault(); return; } fgWheelT = Date.now(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) < 20) return; e.preventDefault(); fgInput(d > 0 ? 'pgdn' : 'pgup'); }, { passive:false });

// janela "em pé" (mais alta que larga): os Favoritos viram a lista comum (como nos consoles); voltando a ficar larga, volta a grade
const isPortrait = () => innerWidth < innerHeight;
let favAsList = false;
function openFavorites() { if (isPortrait()) { favAsList = true; openGlobal('', true); } else { favAsList = false; openFavGrid(); } }
window.addEventListener('resize', () => {
  if (fgInfoOpen || fp.open || fxOpen) return;
  if (screen === 'favgrid' && isPortrait()) { favAsList = true; openGlobal('', true); }
  else if (screen === 'games' && favMode && favAsList && !isPortrait()) { favAsList = false; stopVideo(); openFavGrid(); }
});
// cabeçalho redimensionável: arrastar a borda de baixo (90–320 px), lembrado entre sessões
(() => {
  const h = $('fgHeader'); if (!h) return;
  const set = v => { v = Math.max(90, Math.min(320, Math.round(v))); $('favgrid').style.setProperty('--fgh', v + 'px'); return v; };
  let cur = 150; try { cur = +localStorage.getItem('fgh') || 150; } catch (e) {}
  set(cur);
  const g = document.createElement('div'); g.className = 'fghgrip'; g.title = 'Arraste para redimensionar'; h.appendChild(g);
  g.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); g.classList.add('on');
    const y0 = e.clientY, h0 = h.offsetHeight;
    const mv = ev => { cur = set(h0 + ev.clientY - y0); if (typeof fgCell === 'function') fgCell(); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.classList.remove('on'); try { localStorage.setItem('fgh', cur); } catch (e) {} if (typeof fgCell === 'function') { fgCell(); } };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
  });
})();
