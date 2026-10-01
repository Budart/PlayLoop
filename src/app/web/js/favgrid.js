// PlayLoop — favgrid.js
/* ---------- Favoritos: grade de cards redimensionáveis, com páginas na horizontal ---------- */
let favGridDim = '4x12';            // linhas x colunas (Configuração → Favoritos)
const fg = { items: [], place: [], pages: 1, page: 0, sel: 0 };
let fgInfoOpen = false;
const fgDim = () => { const [r, c] = (favGridDim || '4x12').split('x').map(Number); return { R: r || 4, C: c || 12 }; };
const fgSize = g => { const v = covers['fsz|' + coverKey(g)]; if (!v) return { w: 1, h: 1 }; const [w, h] = v.split(',').map(Number); const { R, C } = fgDim(); return { w: Math.max(1, Math.min(4, C, w || 1)), h: Math.max(1, Math.min(4, R, h || 1)) }; };

// posição escolhida pelo usuário (arrastando): 'fpos|chave' = "página,coluna,linha"
const fgPos = g => { const v = covers['fpos|' + coverKey(g)]; if (!v) return null; const [p, x, y] = v.split(',').map(Number); return { p, x, y }; };
function fgSetPos(g, pos) {
  const key = 'fpos|' + coverKey(g), val = pos ? `${pos.p},${pos.x},${pos.y}` : '';
  if (val) covers[key] = val; else delete covers[key];
  api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url: val }) }).catch(() => {});
}
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
  while (pages.length > 1 && !pages[pages.length - 1].some(r => r.some(Boolean))) pages.pop();   // sem páginas vazias no fim
  fg.pages = Math.max(1, pages.length);
}
async function openFavGrid() {
  sfx('ok'); globalMode = false; favMode = false;
  show('favgrid'); history.replaceState(null, '', '#favoritos');
  $('fgHead').innerHTML = logo(FAVSYS);
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
  fgLayout();
  const { R, C } = fgDim();
  if (!fg.items.length) { fgDetails(); $('fgTrack').innerHTML = '<div class="empty">Nenhum jogo favoritado ainda — use a ⭐ ao lado de um jogo.</div>'; $('fgDots').innerHTML = ''; return; }
  let html = '';
  for (let p = 0; p < fg.pages; p++) {
    html += `<div class="fgpage" style="grid-template-columns:repeat(${C},1fr);grid-template-rows:repeat(${R},1fr)">`;
    fg.place.forEach((pl, i) => {
      if (pl.p !== p) return;
      const g = fg.items[i];
      html += `<div class="fgcard${i === fg.sel ? ' sel' : ''}" data-i="${i}" style="grid-column:${pl.x + 1} / span ${pl.w};grid-row:${pl.y + 1} / span ${pl.h}">
        <div class="fgimg"></div><div class="fgname">${esc(dn(g))}</div>
        <span class="fgrz r" data-rz="r"></span><span class="fgrz b" data-rz="b"></span><span class="fgrz rb" data-rz="rb"></span></div>`;
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
  if (url) { im.style.backgroundImage = `url("${cp(url).replace(/"/g, '%22')}")`; el.classList.add('has'); }
}
function fgPage(p, quiet) {
  fg.page = Math.max(0, Math.min(fg.pages - 1, p));
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
  el.onclick = e => { if (e.target.dataset.rz || el._dragged) { el._dragged = false; return; } fgSelect(i); };
  el.onpointerdown = e => { if (e.button !== 0 || e.target.dataset.rz) return; fgDragStart(e, el, i); };
  el.ondblclick = e => { if (e.target.dataset.rz) return; fgSelect(i, true); launch(); };
  el.oncontextmenu = e => { e.preventDefault(); fgSelect(i, true); fgCtx(e.clientX, e.clientY); };
  // redimensionar arrastando a lateral direita, a de baixo ou o canto (sempre grudando na grade, máx. 4x4)
  el.querySelectorAll('[data-rz]').forEach(h => h.onpointerdown = e => {
    e.preventDefault(); e.stopPropagation(); fgSelect(i, true);
    const page = el.parentNode.getBoundingClientRect(), { R, C } = fgDim(), pl = fg.place[i];
    const gap = parseFloat(getComputedStyle(el.parentNode).columnGap) || 0, cw = (page.width + gap) / C, ch = (page.height + gap) / R, mode = h.dataset.rz, sx = e.clientX, sy = e.clientY;
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
  let ghost = null, target = null, edgeT = 0, edgeDir = 0, last = e;
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
    const r = pg.getBoundingClientRect(), gap = parseFloat(getComputedStyle(pg).columnGap) || 0;
    const cw = (r.width + gap) / C, ch = (r.height + gap) / R;
    const gx = Math.round((x - (sx - r0.left) - r.left) / cw), gy = Math.round((y - (sy - r0.top) - r.top) / ch);
    return { p: fg.page, x: Math.max(0, Math.min(C - pl.w, gx)), y: Math.max(0, Math.min(R - pl.h, gy)), r, cw, ch, gap };
  };
  const move = ev => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
      fgSelect(i, true); el._dragged = true; el.classList.add('dragsrc');
      ghost = el.cloneNode(true); ghost.className = 'fgcard sel fgghost'; ghost.style.cssText = `width:${r0.width}px;height:${r0.height}px;`; document.body.appendChild(ghost);
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
    if (s && target) { s.style.cssText = `left:${target.r.left - v.left + target.x * target.cw}px;top:${target.r.top - v.top + target.y * target.ch}px;width:${pl.w * target.cw - target.gap}px;height:${pl.h * target.ch - target.gap}px`; }
  }
  const up = () => {
    document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); clearInterval(tick);
    if (!ghost) return;
    ghost.remove(); const s = $('fgSlot'); if (s) s.remove(); el.classList.remove('dragsrc');
    if (!target) return;
    const g = fg.items[i];
    fgSetPos(g, { p: target.p, x: target.x, y: target.y });
    // cards que estavam no lugar saem do caminho (vão para o próximo espaço livre)
    fg.items.forEach((o, k) => { const q = fg.place[k]; if (k !== i && q && q.p === target.p && q.x < target.x + pl.w && q.x + q.w > target.x && q.y < target.y + pl.h && q.y + q.h > target.y) fgSetPos(o, null); });
    sfx('ok'); renderFavGrid();
  };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
}
function fgAddPage() { const { R, C } = fgDim(); $('fgTrack').insertAdjacentHTML('beforeend', `<div class="fgpage" style="grid-template-columns:repeat(${C},1fr);grid-template-rows:repeat(${R},1fr)"></div>`); }
// painel flutuante com os detalhes do jogo selecionado (arraste pelo topo; gruda no canto/centro de baixo mais próximo)
let fgDock = 'left'; try { fgDock = localStorage.getItem('fgDock') || 'left'; } catch (e) {}
function fgDetails() {
  const g = fg.items[fg.sel], d = $('fgDet'); if (!d) return;
  if (!g) { d.style.display = 'none'; return; }
  d.style.display = ''; d.dataset.dock = fgDock;
  d.querySelector('.fdn').textContent = dn(g);
  d.querySelector('.fdp').textContent = g.path; d.querySelector('.fdp').title = 'Abrir a pasta do arquivo';
  d.querySelector('.fds').textContent = fmtSize(g.size);
}
(() => {
  const d = $('fgDet'), grip = d.querySelector('.fdgrip');
  d.querySelector('.fdp').onclick = () => { const g = fg.items[fg.sel]; if (g) api('/api/reveal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: g.path }) }).catch(e => toast(e.message, true)); };
  grip.onpointerdown = e => {
    e.preventDefault(); const r = d.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    grip.setPointerCapture(e.pointerId); d.classList.add('moving');
    grip.onpointermove = ev => { d.style.left = (ev.clientX - ox) + 'px'; d.style.top = (ev.clientY - oy) + 'px'; d.style.right = d.style.bottom = 'auto'; d.style.transform = 'none'; };
    grip.onpointerup = ev => {
      grip.onpointermove = grip.onpointerup = null; d.classList.remove('moving');
      const x = ev.clientX / innerWidth; fgDock = x < .34 ? 'left' : x > .66 ? 'right' : 'center';
      try { localStorage.setItem('fgDock', fgDock); } catch (e) {}
      d.style.left = d.style.top = d.style.right = d.style.bottom = d.style.transform = ''; d.dataset.dock = fgDock; sfx('tick');
    };
  };
})();
// menu de contexto do card (botão direito / △)
function fgCtx(x, y, sizes) {
  const g = fg.items[fg.sel]; if (!g) return;
  if (!x) { const r = $('fgTrack').querySelector('.fgcard.sel').getBoundingClientRect(); x = r.left + 20; y = r.top + 20; }
  const { R, C } = fgDim(), cur = fgSize(g);
  if (sizes) {
    ctxItems = [['pen', '← Voltar', () => fgCtx(x, y)], null];
    for (let h = 1; h <= Math.min(4, R); h++) for (let w = 1; w <= Math.min(4, C); w++) ctxItems.push(['cover', `${w} × ${h}${w === cur.w && h === cur.h ? '  ✓' : ''}`, () => fgResize(g, w, h)]);
  } else ctxItems = [
    ['star', 'Desfavoritar', async () => { await toggleFav(g); openFavGrid(); }],
    ['cover', 'Alterar imagem', () => openCover('card')],
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
  const right = document.querySelector('.right') || $('fgInfoBox').firstElementChild;
  if (on) {
    const g = fg.items[fg.sel]; if (!g) return;
    fgInfoOpen = true; $('fgInfo').classList.add('on'); $('fgInfoBox').appendChild(right);
    screen = 'games'; sys = sysOf(g); shown = fg.items; gIdx = -1;
    selectGame(fg.sel, true); sfx('ok');
  } else {
    if (!fgInfoOpen) return;
    stopVideo(); fgInfoOpen = false; $('fgInfo').classList.remove('on');
    document.querySelector('#games .body').appendChild($('fgInfoBox').firstElementChild);
    screen = 'favgrid'; sfx('back');
  }
}
$('fgInfo').onclick = e => { if (e.target === $('fgInfo')) fgInfo(false); };
function fgInput(a) {
  if (a === 'left' || a === 'right' || a === 'up' || a === 'down') fgMove(a);
  else if (a === 'pgup') { fgPage(fg.page - 1); const i = fg.place.findIndex(p => p.p === fg.page); if (i >= 0) fgSelect(i, true); }
  else if (a === 'pgdn') { fgPage(fg.page + 1); const i = fg.place.findIndex(p => p.p === fg.page); if (i >= 0) fgSelect(i, true); }
  else if (a === 'ok') { if (fg.items[fg.sel]) launch(); }
  else if (a === 'menu') fgCtx();
  else if (a === 'fav' && fg.items[fg.sel]) { toggleFav(fg.items[fg.sel]).then(openFavGrid); }
  else if (a === 'back') { fgInfo(false); back(); }
}
$('fgHome').onclick = () => { $('fgHome').blur(); back(); };
let fgWheelT = 0;
$('fgView').addEventListener('wheel', e => { if (screen !== 'favgrid') return; if (Date.now() - fgWheelT < 350) { e.preventDefault(); return; } fgWheelT = Date.now(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (Math.abs(d) < 20) return; e.preventDefault(); fgInput(d > 0 ? 'pgdn' : 'pgup'); }, { passive:false });
