// PlayLoop — covers.js
/* ---------- escolher capa manualmente (estilo TICO) ---------- */
let modalOpen = false, coverGame = null;
let bgMode = false, cardMode = false, logoMode = false, cardKind = 'cover';   // cardKind: no card dos Favoritos, buscar 'cover' (capas) ou 'bg' (fundos)   // logoMode: imagem do título na lombada da capa 3D   // cardMode: imagem do card dos Favoritos (capas + fundos)
function openCover(isBg) {
  sfx('ok');
  const g = shown[gIdx]; if (!g) return;
  coverGame = g; modalOpen = true; cardMode = isBg === 'card'; logoMode = isBg === 'logo'; bgMode = !!isBg && !cardMode && !logoMode;
  $('ctitle').textContent = logoMode ? '🏷 Imagem do título (lombada)' : cardMode ? '🖼 Imagem do card' : bgMode ? '🌄 Escolher imagem de fundo' : '🖼 Escolher capa';
  $('creset').textContent = logoMode ? 'Voltar para o título automático' : cardMode ? 'Voltar para a imagem automática' : bgMode ? 'Voltar para o fundo automático' : 'Voltar para a capa automática';
  $('cgame').textContent = g.name; $('cq').value = cleanTitle(g.name); $('curl').value = '';
  if (cardMode) { const el = $('fgTrack') && $('fgTrack').querySelector(`.fgcard[data-i="${fg.sel}"]`), r = el && el.getBoundingClientRect(); cardKind = r && r.width > r.height * 1.1 ? 'bg' : 'cover'; }   // card deitado: começa pelos fundos
  ckindPaint();
  $('coverModal').classList.add('on'); $('coverModal').classList.toggle('logo', logoMode); $('cq').focus(); $('cq').select();
  searchCovers();
}
function ckindPaint() { const k = $('ckind'); k.style.display = cardMode ? '' : 'none'; k.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === cardKind)); }
function setCardKind(k) { if (!cardMode || k === cardKind) return; cardKind = k; ckindPaint(); sfx('tick'); searchCovers(); }
$('ckind').querySelectorAll('button').forEach(b => b.onclick = () => setCardKind(b.dataset.k));
function closeCover() { sfx('back'); modalOpen = false; $('coverModal').classList.remove('on'); }
async function setCover(url) {
  const g = coverGame; if (!g) return;
  const key = (logoMode ? 'logo|' : bgMode ? 'bg|' : '') + coverKey(g);   // capa do card dos Favoritos = mesma capa dos consoles (um só registro)
  if (logoMode) {
    try { await api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url }) }); } catch (e) { toast(e.message, true); return; }
    if (url) covers[key] = url; else delete covers[key];
    closeCover(); toast(url ? 'Título salvo!' : 'Voltou para o título automático');
    if (shown[gIdx] === g && screen === 'games') { if (lastArt) lastArt.logo = null; showArt(g); }
    return;
  }

  if (bgMode) {
    try { await api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url }) }); } catch (e) { toast(e.message, true); return; }
    if (url) covers[key] = url; else delete covers[key];
    const ok = 'bofs|' + coverKey(g); if (covers[ok]) { delete covers[ok]; api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: ok, url: '' }) }).catch(() => {}); }   // fundo novo começa centralizado
    closeCover(); toast(url ? 'Fundo salvo!' : 'Voltou para o fundo automático');
    if (screen === 'favgrid') { fgBgTok++; fgGameBg(g, true); if (!favBgGame) toast('Fundo salvo — ative "Fundo do jogo" em Configuração → Favoritos para vê-lo nesta tela'); }
    else if (shown[gIdx] === g) showArt(g);
    return;
  }
  if (cardMode) {   // card dos Favoritos: fundo fica só no card (os consoles continuam com a capa); capa é a mesma dos consoles
    const fk = 'fcard|' + coverKey(g), asBg = url && cardKind === 'bg';
    if (asBg || covers[fk] || !url) { if (asBg) covers[fk] = url; else delete covers[fk]; api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: fk, url: asBg ? url : '' }) }).catch(() => {}); }
    if (asBg) { closeCover(); toast('Fundo salvo no card!'); renderFavGrid(); return; }
    if (!url) { closeCover(); toast('Voltou para a imagem automática'); renderFavGrid(); return; }   // "padrão" no card não mexe na capa dos consoles
  }
  try { await api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url }) }); } catch (e) { toast(e.message, true); return; }
  if (url) covers[key] = url; else { delete covers[key]; delete artCache[key]; delete artDisk[key]; api('/api/artcache', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, val: null }) }).catch(() => {}); }
  closeCover(); toast(url ? 'Capa salva!' : 'Voltou para a capa automática');
  if (screen === 'favgrid') renderFavGrid(); else if (shown[gIdx] === g) showArt(g);
}
let sortT;
function sortGrid() {
  clearTimeout(sortT); if (coverLvl > 1) return; sortT = setTimeout(() => {
    const res = $('cres'), its = [...res.querySelectorAll('.it:not(.more)')], mo = res.querySelector('.it.more');
    its.sort((a, b) => (+b.dataset.ph - +a.dataset.ph) || (+b.dataset.ov - +a.dataset.ov) || (logoMode ? 0 : (bgMode || (cardMode && cardKind === 'bg')) ? (+b.dataset.ar > 1.2) - (+a.dataset.ar > 1.2) : aspectOk(+b.dataset.ar) - aspectOk(+a.dataset.ar)) || ((+b.dataset.px || 0) - (+a.dataset.px || 0))).forEach(el => res.appendChild(el));   // nome exato > palavras em comum > resolução
    if (mo) res.appendChild(mo);   // "Mais" sempre no fim
  }, 120);
}
let coverLvl = 1, coverLast = 0;   // "Mais +": cada clique busca mais fundo em cada fonte
async function searchCovers(more) {
  const q = $('cq').value.trim(), res = $('cres'), s = (coverGame && sysOf(coverGame)) || sys, L = more ? ++coverLvl : (coverLvl = 1), y = res.scrollTop;
  if (!more) { res.innerHTML = ''; coverLast = 0; } else { const m = res.querySelector('.it.more'); if (m) { m.classList.add('busy'); m.querySelector('span').textContent = 'Buscando...'; } }
  if (!q) return;
  if (!more) $('cmsg').textContent = 'Buscando...';
  const items = [];
  const bgLike = bgMode || (cardMode && cardKind === 'bg');
  const conv = u => !bgLike ? u : u.replace('/Named_Boxarts/', '/Named_Snaps/').replace(/library_600x900(_2x)?\.jpg$/, 'library_hero.jpg');
  const toBg = u => u.replace('/Named_Boxarts/', '/Named_Snaps/').replace(/library_600x900(_2x)?\.jpg$/, 'library_hero.jpg');
  const add = (url, label, src) => { for (const u of [conv(url)]) if (!items.some(i => i.url === u)) items.push({ url: u, label, src, ...relevance(q, label) }); };
  // SteamGridDB ligado: só capas (grids) ou fundos (heroes) de lá, ordenados como na escolha automática
  // SteamGridDB corre em paralelo com as outras fontes (e cada jogo dele também)
  const sgP = !sgdbOn ? Promise.resolve([]) : (async () => {
    try {
      const games = (await sg('/api/v2/search/autocomplete/' + encodeURIComponent(q))).map(x => ({ x, ...relevance(q, x.name) })).sort((a, b) => (b.phrase - a.phrase) || (b.overlap - a.overlap)).slice(0, 3 * L);
      const lists = await Promise.all(games.map(gm => (logoMode ? sg(`/api/v2/logos/game/${gm.x.id}?${STATIC}`) : bgLike ? sg(`/api/v2/heroes/game/${gm.x.id}?${STATIC}`) : sgdbGrids(gm.x.id)).catch(() => [])));
      return games.flatMap((gm, k) => lists[k].map(x => ({ url: x.url, label: gm.x.name, src: 'SteamGridDB · ★' + (x.score || 0), phrase: gm.phrase, overlap: gm.overlap })));
    } catch (e) { $('cmsg').textContent = 'SteamGridDB: ' + e.message; return []; }
  })();
  const N = (sgdbOn ? 6 : 10) * L;   // demais fontes: 6 de cada com o SteamGridDB ligado (10 sem ele); mais a cada "Mais"
  {
  if (logoMode) {   // títulos: logos do Steam e da libretro (Named_Logos)
    for (const it of (await steamSearch(q)).slice(0, N)) items.push({ url: `${STEAM}${it.id}/logo.png`, label: it.name, src: 'Steam', ...relevance(q, it.name) });
    await loadThumbIndex(s); const ix = s.thumbs && thumbIndex[s.thumbs];
    if (ix && ix.names) { const ws = q.toLowerCase().split(/\s+/).filter(Boolean); ix.names.filter(n => ws.every(w => n.toLowerCase().includes(w))).slice(0, N).forEach(n => items.push({ url: `${THUMBS}${s.thumbs}/master/Named_Logos/${encodeURIComponent(n)}`, label: n.replace(/\.png$/i, ''), src: 'libretro', ...relevance(q, n) })); }
  } else {
  // todas as fontes ao mesmo tempo (antes uma esperava a outra); a ordem de entrada na lista continua a mesma
  const safe = p => p.catch(() => []), fake = { name: q };
  const [, idu, st, wk, fd, pg, sw] = await Promise.all([
    loadThumbIndex(s),
    safe(idCovers(coverGame).then(async us => { const u = await firstOk(us); return u ? [u] : []; })),
    safe(steamSearch(q)), safe(wikiMain(q, N)), safe(fandomImage(fake, N)),
    safe(mw('https://www.pcgamingwiki.com/w/api.php', q, N)), safe(mw('https://strategywiki.org/w/api.php', q, N))]);
  // 1) acervo libretro (busca por palavras no índice do console)
  const idx = s.thumbs && thumbIndex[s.thumbs];
  if (idx && idx.names) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    idx.names.filter(n => words.every(w => n.toLowerCase().includes(w))).slice(0, N)
      .forEach(n => add(`${THUMBS}${s.thumbs}/master/Named_Boxarts/${encodeURIComponent(n)}`, n.replace(/\.png$/i, ''), 'libretro'));
  }
  // 1b) código do jogo (GameTDB / xlenore), 1c) Steam, 1e) Wikipédia, 1d) Fandom, PCGamingWiki e StrategyWiki
  idu.forEach(u => add(u, 'Código do jogo', /gametdb/.test(u) ? 'GameTDB' : /steam/.test(u) ? 'Steam' : 'xlenore'));
  st.slice(0, N).forEach(it => add(`${STEAM}${it.id}/library_600x900_2x.jpg`, it.name, 'Steam'));
  wk.forEach(p => add(p.img, p.title, p.src)); fd.forEach(p => add(p.img, p.title, p.src));
  pg.forEach(p => add(p.img, p.title, 'PCGamingWiki')); sw.forEach(p => add(p.img, p.title, 'StrategyWiki'));
  }
  }
  (await sgP).forEach(x => { if (!items.some(i => i.url === x.url)) items.push(x); });
  if (modalOpen === false) return;
  $('cmsg').textContent = items.length ? `${items.length} imagens encontradas — clique para usar ${logoMode ? 'como título' : 'como capa'}.` : 'Nada encontrado. Tente outro nome, ou cole o link de uma imagem.';
  const from = more ? coverLast : 0, html = items.slice(from).map((it, i0) => { const i = i0 + from; return `<div class="it" data-i="${i}" data-ph="${it.phrase}" data-ov="${it.overlap.toFixed(3)}"><img src="${esc(it.url)}" alt="" onload="this.nextElementSibling.textContent=this.naturalWidth+'×'+this.naturalHeight;this.parentNode.dataset.px=this.naturalWidth*this.naturalHeight;this.parentNode.dataset.ar=this.naturalWidth/this.naturalHeight;sortGrid()" onerror="this.parentNode.remove()"><div class="dim">…</div><div>${esc(it.label)}</div><div class="src">${esc(it.src)}</div></div>`; }).join('');
  if (more) { const m = res.querySelector('.it.more'); if (m) m.remove(); res.insertAdjacentHTML('beforeend', html); } else res.innerHTML = html;
  res.querySelectorAll('.it:not(.more)').forEach(el => el.onclick = () => setCover(items[+el.dataset.i].url));
  const grew = items.length > coverLast; coverLast = items.length;
  if (items.length && (grew || !more)) { const m = document.createElement('div'); m.className = 'it more'; m.innerHTML = '<b>＋</b><span>Mais</span>'; m.onclick = e => { e.stopPropagation(); if (!m.classList.contains('busy')) searchCovers(true); }; res.appendChild(m); }
  else if (more) $('cmsg').textContent = `${items.length} imagens — não há mais resultados para essa busca.`;
  if (more) res.scrollTop = y;
}
$('cgo').onclick = () => searchCovers();
$('cq').onkeydown = e => { if (e.key === 'Enter') searchCovers(); };
$('cuse').onclick = () => { const u = $('curl').value.trim(); if (/^https?:\/\//i.test(u)) setCover(u); else toast('Cole um link começando com http', true); };
$('curl').onkeydown = e => { if (e.key === 'Enter') $('cuse').onclick(); };
$('creset').onclick = () => setCover('');
$('cfile').onclick = async () => {
  $('cfile').disabled = true;
  try { const r = await api('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: 'image', start: '' }) }); if (r.path) setCover('/api/localimg?p=' + encodeURIComponent(r.path)); }
  catch (e) { toast(e.message, true); }
  $('cfile').disabled = false;
};
$('cclose').onclick = closeCover;
$('coverModal').onclick = e => { if (e.target.id === 'coverModal') closeCover(); };

// emuladores recomendados por console (nome, site oficial) — só recomendação, nada é baixado
const EMU_REC = {
  ps1: [['DuckStation', 'https://www.duckstation.org/'], ['ePSXe', 'https://www.epsxe.com/'], ['RetroArch', 'https://www.retroarch.com/']],
  ps2: [['PCSX2', 'https://pcsx2.net/'], ['Play!', 'https://purei.org/'], ['RetroArch', 'https://www.retroarch.com/']],
  ps3: [['RPCS3', 'https://rpcs3.net/']],
  psp: [['PPSSPP', 'https://www.ppsspp.org/'], ['RetroArch', 'https://www.retroarch.com/']],
  gc: [['Dolphin', 'https://dolphin-emu.org/'], ['RetroArch', 'https://www.retroarch.com/']], wii: [['Dolphin', 'https://dolphin-emu.org/'], ['RetroArch', 'https://www.retroarch.com/']],
  wiiu: [['Cemu', 'https://cemu.info/']],
  '3ds': [['Azahar', 'https://azahar-emu.org/'], ['Panda3DS', 'https://panda3ds.com/']],
  nds: [['melonDS', 'https://melonds.kuribo64.net/'], ['DeSmuME', 'https://desmume.org/'], ['No$GBA', 'https://problemkaputt.de/gba.htm']],
  n64: [['Project64', 'https://www.pj64-emu.com/'], ['simple64', 'https://simple64.github.io/'], ['ares', 'https://ares-emu.net/']],
  gba: [['mGBA', 'https://mgba.io/'], ['VisualBoyAdvance-M', 'https://visualboyadvance-m.org/'], ['RetroArch', 'https://www.retroarch.com/']],
  gbc: [['mGBA', 'https://mgba.io/'], ['SameBoy', 'https://sameboy.github.io/'], ['BGB', 'https://bgb.bircd.org/']],
  gb: [['mGBA', 'https://mgba.io/'], ['SameBoy', 'https://sameboy.github.io/'], ['BGB', 'https://bgb.bircd.org/']],
  snes: [['Snes9x', 'https://www.snes9x.com/'], ['bsnes', 'https://github.com/bsnes-emu/bsnes'], ['Mesen', 'https://www.mesen.ca/']],
  nes: [['Mesen', 'https://www.mesen.ca/'], ['FCEUX', 'https://fceux.com/'], ['Nestopia UE', 'http://0ldsk00l.ca/nestopia/']],
  sms: [['Kega Fusion', 'https://www.carpeludum.com/kega-fusion/'], ['Emulicious', 'https://emulicious.net/'], ['Mesen', 'https://www.mesen.ca/']],
  genesis: [['Kega Fusion', 'https://www.carpeludum.com/kega-fusion/'], ['BlastEm', 'https://www.retrodev.com/blastem/'], ['RetroArch', 'https://www.retroarch.com/']],
  dreamcast: [['Flycast', 'https://github.com/flyinghead/flycast'], ['Redream', 'https://redream.io/'], ['Demul', 'http://demul.emulation64.com/']],
  saturn: [['Mednafen', 'https://mednafen.github.io/'], ['Yaba Sanshiro', 'https://www.yabasanshiro.com/'], ['RetroArch', 'https://www.retroarch.com/']],
  neogeo: [['FinalBurn Neo', 'https://github.com/finalburnneo/FBNeo'], ['MAME', 'https://www.mamedev.org/'], ['RetroArch', 'https://www.retroarch.com/']],
  xbox: [['xemu', 'https://xemu.app/'], ['Cxbx-Reloaded', 'https://cxbx-reloaded.co.uk/']],
  xbox360: [['Xenia', 'https://xenia.jp/'], ['Xenia Canary', 'https://github.com/xenia-canary/xenia-canary']],
};
let launching = null, launchedAt = 0;
async function launch() {
  const g = shown[gIdx]; if (!g) return;
  // evita abrir o mesmo jogo várias vezes (Enter repetido): ignora enquanto abre e por 5 s depois
  if (launching === g && (launchedAt === 0 || Date.now() - launchedAt < 5000)) { toast('Já está abrindo ' + dn(g) + '…'); return; }
  launching = g; launchedAt = 0;
  let ok = false; try { ok = await doLaunch(g); } finally { if (ok) launchedAt = Date.now(); else launching = null; }
}
async function doLaunch(g) {
  const s = sysOf(g);
  if (s.type !== 'pc' && !s.emulatorOk) {   // sem emulador: oferece escolher agora e já abre o jogo
    const rec = EMU_REC[g.sid || s.id];
    if (rec) {   // lista os emuladores mais conhecidos com o site oficial de cada um (nada é baixado)
      const list = '<ul class="emurec">' + rec.map(([n, u]) => `<li><a data-href="${esc(u)}">${esc(n)}</a><small>${esc(u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</small></li>`).join('') + '</ul>';
      const ans = await ask('Nenhum emulador configurado', `${esc(s.name)} ainda não tem emulador. Os mais recomendados (gratuitos) são:${list}Baixe um deles no site oficial e depois selecione o executável aqui.`, 'Selecionar .exe', null, true);
      if (!ans) return false;
    } else if (!await ask('Nenhum emulador configurado', `${s.name} ainda não tem emulador. Quer selecionar o executável do emulador agora? O PlayLoop configura tudo e já abre o jogo.`, 'Selecionar emulador')) return false;
    let r; try { r = await api('/api/setemu', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ console: g.sid || s.id }) }); } catch (e) { toast(e.message, true); return false; }
    if (!r.ok) return false;
    [s, allSystems.find(x => x.id === s.id), systems.find(x => x.id === s.id)].forEach(x => { if (x) x.emulatorOk = true; });
    toast('Emulador salvo: ' + r.emulator.split(/[\\/]/).pop());
    const nt = $('details').querySelector('.notice'); if (nt) nt.remove();
  }
  sfx('launch'); music.pause(); toast('▶ Abrindo ' + dn(g) + '…');
  setGameOn(true);
  try { await api('/api/launch', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ console: g.sid || sys.id, path: g.path }) }); toast('▶ Abrindo ' + g.name); return true; }
  catch (e) { setGameOn(false); toast(e.message, true); return false; }
}

// navegar pelas imagens com as setas / D-pad (Enter ou ✕ escolhe)
function coverNav(dir) {
  const its = [...$('cres').querySelectorAll('.it')]; if (!its.length) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
  let k = its.findIndex(e => e.classList.contains('kb'));
  const cols = Math.max(1, its.filter(e => e.offsetTop === its[0].offsetTop).length);
  if (k < 0) k = 0;
  else k = Math.max(0, Math.min(its.length - 1, k + (dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -cols : cols)));
  its.forEach((e, j) => e.classList.toggle('kb', j === k)); its[k].scrollIntoView({ block:'nearest' }); sfx('tick');
}
function coverPick() { const el = $('cres').querySelector('.it.kb'); if (el) { el.click(); return true; } return false; }
