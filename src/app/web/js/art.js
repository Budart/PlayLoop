// PlayLoop — art.js
// ---- mais repositórios (MediaWiki, via servidor): Fandom, PCGamingWiki, StrategyWiki ----
async function mw(base, q, n) {
  const u = `${base}?action=query&format=json&generator=search&gsrnamespace=0&gsrlimit=${n || 1}&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail|original&pithumbsize=1000`;
  try {
    const d = await api('/api/proxy?u=' + encodeURIComponent(u));
    return Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index)
      .map(p => ({ title: p.title, img: (p.thumbnail && p.thumbnail.source) || (p.original && p.original.source) }))
      .filter(p => p.img && !/\.svg/i.test(p.img));
  } catch (e) { return []; }
}
function fandomWikis(t) {
  const base = t.split(/:| - | – /)[0].trim(), slug = x => x.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  const words = base.split(/\s+/).filter(w => w.length > 2 && !/^(the|of|and)$/i.test(w));
  return [...new Set([slug(t), slug(base), words[0] ? slug(words[0]) : '', words.length > 1 ? slug(words[0] + words[1]) : ''])].filter(x => x.length >= 3).slice(0, 4);
}
async function fandomImage(g, n) {
  const t = cleanTitle(g.name); if (!t) return [];
  const out = [];
  for (const w of fandomWikis(t)) {
    for (const p of await mw(`https://${w}.fandom.com/api.php`, t, n || 1)) out.push({ ...p, src: `Fandom (${w})` });
    if (out.length && !n) break;
  }
  return out;
}
const EXTRA_REPOS = [
  { key:'fandom', label:'Fandom', find: g => fandomImage(g) },
  { key:'pcgw', label:'PCGamingWiki', find: async g => (await mw('https://www.pcgamingwiki.com/w/api.php', cleanTitle(g.name))).map(p => ({ ...p, src:'PCGamingWiki' })) },
  { key:'strategywiki', label:'StrategyWiki', find: async g => (await mw('https://strategywiki.org/w/api.php', cleanTitle(g.name))).map(p => ({ ...p, src:'StrategyWiki' })) },
];
let covers = {};
const coverKey = g => g.sid + '|' + g.path;
// 3º repositório: capas pelo código do jogo lido da ROM (GameTDB p/ Wii/DS/3DS, xlenore p/ PS1/PS2)
const idCache = {};
async function idCovers(g) {
  const s = systems.concat(allSystems).find(x => x.id === g.sid) || sys;
  const kind = s.type === 'pc' ? 'pc' : s.id;
  if (!['wii', 'nds', '3ds', 'ps1', 'ps2', 'pc'].includes(kind)) return [];
  const k = coverKey(g);
  if (!(k in idCache)) { try { idCache[k] = (await api(`/api/gameid?c=${encodeURIComponent(s.id)}&p=${encodeURIComponent(g.path)}`)).id || ''; } catch (e) { idCache[k] = ''; } }
  const id = idCache[k]; if (!id) return [];
  if (kind === 'pc') return steamUrls(id);
  if (s.id === 'ps2') return [`https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${id}.jpg`];
  if (s.id === 'ps1') return [`https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${id}.jpg`];
  const reg = { E:'US', P:'EN', J:'JA', D:'DE', F:'FR', S:'ES', I:'IT', K:'KO' }[id[3]] || 'US';
  const regs = [...new Set([reg, 'US', 'EN', 'JA'])];
  const plat = { wii:'wii', nds:'ds', '3ds':'3ds' }[s.id];
  const out = [];
  regs.forEach(r => ['png', 'jpg'].forEach(x => out.push(`https://art.gametdb.com/${plat}/cover/${r}/${id}.${x}`)));
  return out;
}
// 4º repositório: Steam (busca feita pelo servidor do app)
const STEAM = 'https://cdn.cloudflare.steamstatic.com/steam/apps/';
const steamUrls = id => [`${STEAM}${id}/library_600x900_2x.jpg`, `${STEAM}${id}/library_600x900.jpg`, `${STEAM}${id}/header.jpg`];
const steamCache = {};
async function steamSearch(q) {
  if (!q) return [];
  if (!steamCache[q]) { try { steamCache[q] = ((await api('/api/steam?q=' + encodeURIComponent(q))).items || []).filter(i => i.type === 'app'); } catch (e) { steamCache[q] = []; } }
  return steamCache[q];
}
// cache de capas no computador (servidor guarda as imagens e o resultado da busca)
let cacheOn = true, artDisk = {};
const cp = u => (cacheOn && u && /^https?:/.test(u)) ? '/api/img?u=' + encodeURIComponent(u) : u;
// capa já conhecida (manual, memória ou cache em disco) — resposta imediata, sem esperar nada
function cachedArt(g) {
  const key = coverKey(g);
  if (covers[key]) return { box: covers[key], snap: null, src: 'manual', ratio: artDisk[key] && artDisk[key].ratio, logo: artDisk[key] && artDisk[key].logo };
  if (artCache[key]) { const a = artCache[key]; if (a.box || !a.t || Date.now() - a.t < 3000) return a; delete artCache[key]; }   // capa genérica nunca é definitiva: depois de 1 min tenta de novo
  const d = artDisk[key]; if (cacheOn && d && d.v === 2 && (sgdbOn || d.src !== 'sgdb') && d.box) return artCache[key] = d;   // v2: capas reais primeiro (resultados antigos são refeitos uma vez)   // ignora capas antigas da Wikipédia
  return null;
}
// fila de buscas: no máximo 3 ao mesmo tempo; o pedido mais recente (o que está na tela/selecionado) vai na frente;
// pedidos repetidos do mesmo jogo esperam a mesma busca
const artInflight = {}, artQueue = []; let artRunning = 0;
function artPump() {
  while (artRunning < 3 && artQueue.length) {
    const job = artQueue.pop(); artRunning++;
    resolveArt0(job.g).then(job.ok, () => job.ok(null)).finally(() => { artRunning--; artPump(); });
  }
}
function resolveArt(g, now) {   // now: jogo em foco — passa na frente de tudo, sem esperar a fila
  const key = coverKey(g);
  const c = cachedArt(g); if (c) return Promise.resolve(c);
  if (artInflight[key] && now) { const j = artQueue.find(x => x.key === key); if (j) { artQueue.splice(artQueue.indexOf(j), 1); resolveArt0(j.g).then(j.ok, () => j.ok(null)); } return artInflight[key]; }
  if (artInflight[key]) { const j = artQueue.find(x => x.key === key); if (j) { artQueue.splice(artQueue.indexOf(j), 1); artQueue.push(j); } return artInflight[key]; }   // pediu de novo: sobe na fila
  return artInflight[key] = new Promise(ok => { if (now) resolveArt0(g).then(ok, () => ok(null)); else { artQueue.push({ key, g, ok }); artPump(); } }).then(r => {
    delete artInflight[key];
    if (r && !r.box) { artCache[key] = { ...r, t: Date.now() }; return r; }   // sem capa: só em memória por 1 min (nunca salvo como definitivo)
    if (cacheOn && r && r.src !== 'manual') { const v = { ...r, t: Date.now() }; artDisk[key] = v; api('/api/artcache', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, val: v }) }).catch(() => {}); }   // sem capa também fica guardado (por uns dias), para não refazer tudo a cada abertura
    return r;
  });
}
// mede a imagem (largura × altura); null se não carregar
const imgSize = (url, ms) => new Promise(ok => { const i = new Image(); const t = setTimeout(() => ok(null), ms || 6000);
  i.onload = () => { clearTimeout(t); ok(i.naturalWidth > 1 ? { url, px: i.naturalWidth * i.naturalHeight, ar: i.naturalWidth / i.naturalHeight } : null); }; i.onerror = () => { clearTimeout(t); ok(null); }; i.src = url; });
// Wikipédia: só a imagem principal (infobox) de artigos de JOGO — nada de fotos secundárias
async function wikiMain(title, n) {
  const out = [];
  for (const [lang, tpl] of [['en', 'Infobox video game'], ['pt', 'Info/Jogo eletrônico']]) {
    try {
      const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=${n || 1}&gsrsearch=${encodeURIComponent(title + ' hastemplate:"' + tpl + '"')}&prop=pageimages&piprop=original|thumbnail&pithumbsize=1000&pilicense=any`;
      const d = await (await fetch(u)).json();
      Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index).forEach(p => {
        const img = (p.thumbnail && p.thumbnail.source) || (p.original && p.original.source);
        if (img && !/\.svg/i.test(img)) out.push({ img, title: p.title, src: 'Wikipédia ' + lang.toUpperCase() });
      });
      if (out.length && !n) break;
    } catch (e) {}
  }
  return out;
}
// ---- relevância: quantas palavras do nome do jogo aparecem no título do resultado ----
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'in', 'on', 'to', 'for']);
const normT = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.(png|jpe?g|webp)$/, '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const words = t => normT(t).split(' ').filter(w => w && !STOP.has(w));
function relevance(query, title) {
  const qw = words(query), tw = new Set(words(title));
  if (!qw.length) return { phrase: 0, overlap: 0 };
  const phrase = (' ' + normT(title) + ' ').includes(' ' + normT(query) + ' ') ? 1 : 0;   // contém o nome inteiro, ex.: "elite soccer"
  const overlap = qw.filter(w => tw.has(w)).length / qw.length;
  return { phrase, overlap };
}
// proporções (largura ÷ altura) padrão das capas de cada console — 2 por console (ex.: EUA e Japão/Europa)
const ASPECTS = {
  snes: [1.38, 1.30], n64: [1.38, 1.30], gb: [1.00, 0.80], gbc: [1.00, 0.80], gba: [1.00, 0.72],
  nds: [0.89, 0.86], '3ds': [0.87, 0.91], wii: [0.71, 0.70], wiiu: [0.79, 0.71], gc: [0.70, 0.71], switch: [0.62, 0.63],
  nes: [0.72, 0.62], sms: [0.71, 0.75], genesis: [0.72, 0.79], dreamcast: [1.00, 0.89], saturn: [1.00, 0.63], neogeo: [0.70, 0.66],
  ps1: [1.00, 0.89], ps2: [0.70, 0.71], psp: [0.58, 0.56], ps3: [0.81, 0.79], xbox: [0.70, 0.71], xbox360: [0.70, 0.71], pc: [0.67, 0.78],
};
function aspectOk(ar) {   // 1 se a imagem tem a proporção de uma capa do console (±10%)
  const list = ASPECTS[sys && sys.type === 'pc' ? 'pc' : sys && sys.id] || [];
  return ar && list.some(r => Math.abs(ar - r) / r <= .10) ? 1 : 0;
}
// prioridade: nome inteiro > palavras em comum > proporção de capa do console > resolução
const relCmp = (a, b) => (b.phrase - a.phrase) || (b.overlap - a.overlap) || (aspectOk(b.ar) - aspectOk(a.ar)) || (b.px - a.px);
// ---- SteamGridDB: capa (grid), fundo (hero) e logo, pela nota da comunidade ----
let sgdbOn = false;
const sgdbCache = {};
const sg = p => api('/api/sgdb?p=' + encodeURIComponent(p)).then(r => (r && r.data) || []);
async function sgdbGame(g) {
  const k = coverKey(g); if (k in sgdbCache) return sgdbCache[k];
  const q = cleanTitle(dn(g)) || dn(g);
  let id = null;
  try {
    const sid = await idCovers(g).then(u => (u[0] || '').match(/steam\/apps\/(\d+)/));   // jogos de PC da Steam: pelo número do app
    if (sid) { const r = await api('/api/sgdb?p=' + encodeURIComponent('/api/v2/games/steam/' + sid[1])); id = r && r.data && r.data.id; }
    if (!id) {
      const list = await sg('/api/v2/search/autocomplete/' + encodeURIComponent(q));
      const best = list.map(x => ({ x, ...relevance(q, x.name) })).filter(x => x.phrase || x.overlap >= .6).sort((a, b) => (b.phrase - a.phrase) || (b.overlap - a.overlap))[0];
      id = best ? best.x.id : null;
    }
  } catch (e) {}
  return sgdbCache[k] = id;
}
const STATIC = 'types=static&nsfw=false&humor=any&epilepsy=any';
async function sgdbGrids(id) { return (await sg(`/api/v2/grids/game/${id}?${STATIC}&mimes=image/png,image/jpeg,image/webp`)).filter(x => !/\.(gif|webm)$/i.test(x.url)); }
async function sgdbArt(g) {
  const id = await sgdbGame(g); if (!id) return null;
  const [grids, heroes, logos] = await Promise.all([sgdbGrids(id).catch(() => []), sg(`/api/v2/heroes/game/${id}?${STATIC}`).catch(() => []), sg(`/api/v2/logos/game/${id}?${STATIC}`).catch(() => [])]);
  // grids já vêm por nota (maior primeiro); preferimos a de proporção de capa do console
  const grid = grids.find(x => aspectOk(x.width / x.height)) || grids[0];
  return { box: grid ? grid.url : null, snap: heroes[0] ? heroes[0].url : null, logo: logos[0] ? logos[0].url : null };
}
function genHash(n) { let h = 0; for (const ch of (n || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }   // cor da capa genérica (fixa por jogo)
async function resolveArt0(g) {
  const key = coverKey(g);
  if (covers[key]) return { box: covers[key], snap: null, src: 'manual' };
  if (artCache[key]) return artCache[key];
  const q = cleanTitle(dn(g)) || dn(g), sys = (typeof sysOf === 'function' && sysOf(g)) || {};   // console do próprio jogo (Favoritos misturam consoles)
  // capas: fontes "reais" primeiro (scans/artes oficiais); SteamGridDB (artes da comunidade) só se nada servir.
  // fundos e títulos: SteamGridDB primeiro quando ligado. Ele começa em paralelo para não atrasar nada.
  const sgP = sgdbOn ? sgdbArt(g).catch(() => null) : Promise.resolve(null);
  const sized = async (src, list, trusted) => {   // list: [{url, title}]
    const out = await Promise.all(list.map(async it => { const r = await imgSize(it.url); return r ? { ...r, src, title: it.title, ...(trusted ? { phrase: 1, overlap: 1 } : relevance(q, it.title)) } : null; }));
    return out.filter(Boolean);
  };
  let raw = [];   // tudo que carregou, mesmo com nome só parecido (usado como último recurso)
  const run = tasks => Promise.all(tasks).then(l => { const all = [].concat(...l); raw = raw.concat(all); return all.filter(c => c.phrase || c.overlap >= .6); });   // descarta quem bate só com parte do nome
  const add = (arr, src, p, trusted) => arr.push(p.then(list => sized(src, list || [], trusted)).catch(() => []));
  const repo = (k, n) => EXTRA_REPOS.find(r => r.key === k).find(g).then(l => l.slice(0, n || 3).map(p => ({ url: p.img, title: p.title })));
  const steam = n => steamSearch(q).then(items => Promise.all(items.slice(0, n).map(async it => { const u = await firstOk(steamUrls(it.id)); return u ? { url: u, title: it.name } : null; }))).then(l => l.filter(Boolean));
  const wiki = () => wikiMain(q, 2).then(l => l.map(p => ({ url: p.img, title: p.title })));
  const byId = () => idCovers(g).then(async urls => { const u = await firstOk(urls); return u ? [{ url: u, title: q }] : []; });
  // 1ª rodada (rápidas e com capas reais): libretro + código do jogo (GameTDB/xlenore); no PC, Steam
  const t1 = [], t2 = [];
  if (sys.type === 'pc') { add(t1, 'steam', byId(), true); add(t1, 'steam', steam(3)); }
  else { if (sys.thumbs) await Promise.race([loadThumbIndex(sys), new Promise(r => setTimeout(r, 1200))]);   // índice ainda baixando (1ª vez): não espera, tenta os nomes mais comuns
    add(t1, 'libretro', firstOk(boxartUrls(sys, g.name)).then(u => u ? [{ url: u, title: decodeURIComponent(u.split('/').pop()) }] : []), true); add(t1, 'code', byId(), true); }   // libretro achada pelo nome do arquivo: confiável
  // fontes oficiais têm até 3 s; passou disso sem capa, usa a do SteamGridDB (se houver) em vez de esperar mais
  const t1P = run(t1).then(l => l.sort(relCmp));
  let found = await Promise.race([t1P, new Promise(r => setTimeout(() => r(null), 3000))]);
  let sg = null, best = found && found[0];
  if (!best && sgdbOn) { sg = await sgP; if (sg && sg.box) best = { url: sg.box, src: 'sgdb' }; }
  if (!best) {
    found = found || await t1P; best = found[0];
    // 2ª rodada (wikis, mais lentas) só se a primeira não achou nada com o nome certo
    if (!found.some(c => c.phrase)) {
      add(t2, 'fandom', repo('fandom')); add(t2, 'strategywiki', repo('strategywiki')); add(t2, 'pcgw', repo('pcgw')); add(t2, 'wikimain', wiki());
      if (sys.type !== 'pc') add(t2, 'steam', steam(3));
      found = found.concat(await run(t2)).sort(relCmp); best = found[0];
    }
  }
  if (!sg) sg = await sgP;
  if (!best && sg && sg.box) best = { url: sg.box, src: 'sgdb' };
  // nunca ficar sem capa: a mais parecida de qualquer fonte > busca na Steam sem exigir o nome exato
  if (!best) best = raw.filter(c => c.overlap >= .3).sort(relCmp)[0];
  if (!best) { const st = (await run([sized('steam', await steam(1).catch(() => []))])), any = raw.sort(relCmp)[0]; best = st[0] || any; }
  let box = best ? best.url : null, src = best ? best.src : 'generica', snap = null, logo = null;
  if (src === 'code') src = /gametdb/.test(box) ? 'gametdb' : /steam/.test(box) ? 'steam' : 'xlenore';
  // fundo: SteamGridDB (hero) > tela do jogo (libretro) > arte da Steam
  if (sg && sg.snap) snap = sg.snap;
  else if (box && /Named_Boxarts/.test(box)) snap = await firstOk([box.replace('/Named_Boxarts/', '/Named_Snaps/'), box.replace('/Named_Boxarts/', '/Named_Titles/')]);
  else if (box && /steamstatic/.test(box)) snap = await firstOk([box.replace(/\/[^/]+$/, '/library_hero.jpg')]);
  if (!snap && sys.type !== 'pc') { const lib = (found || []).find(f => f.src === 'libretro'); if (lib) snap = await firstOk([lib.url.replace('/Named_Boxarts/', '/Named_Snaps/')]); }
  // título (logo): SteamGridDB > logo oficial da libretro (Named_Logos) ou da Steam — uma tentativa só, sem buscas extras
  if (sg && sg.logo) logo = sg.logo;
  else if (box && /Named_Boxarts/.test(box)) logo = await firstOk([box.replace('/Named_Boxarts/', '/Named_Logos/')]);
  else if (box && /steamstatic/.test(box)) logo = await firstOk([box.replace(/\/[^/]+$/, '/logo.png')]);
  return artCache[key] = { box, snap, src, v: 2, ...(logo ? { logo } : {}) };
}
/* ---------- case 3D: proporção e laterais de cada console ---------- */
const CASES = {
  snes:   { r:1.40, d:.24, spine:'#d8d8d8', txt:'#3a3a3a', rim:0 },
  n64:    { r:1.40, d:.24, spine:'#161616', txt:'#e8e8e8', rim:0 },
  gbc:    { r:1.00, d:.20, spine:'#ececec', txt:'#333',    rim:0 },
  gba:    { r:1.00, d:.20, spine:'#2d2f7a', txt:'#fff',    rim:0 },
  nds:    { r:.89,  d:.12, spine:'#cfd3d7', txt:'#444',    rim:.025, rimc:'#dfe3e7' },
  '3ds':  { r:.89,  d:.12, spine:'#f4f4f4', txt:'#ce181e', rim:.025, rimc:'#fafafa' },
  wii:    { r:.71,  d:.075, spine:'#f5f5f5', txt:'#666',   rim:.03,  rimc:'#fbfbfb' },
  switch: { r:.62,  d:.06, spine:'#e60012', txt:'#fff',    rim:.025, rimc:'#e60012' },
  sms:    { r:.72,  d:.13, spine:'#141414', txt:'#ddd',    rim:.03,  rimc:'#161616' },
  genesis:{ r:.72,  d:.13, spine:'#141414', txt:'#ddd',    rim:.03,  rimc:'#161616' },
  neogeo: { r:.70,  d:.17, spine:'#111',    txt:'#e5c100', rim:0 },
  ps1:    { r:1.00, d:.075, spine:'#1b1b1b', txt:'#bbb',   rim:.02,  rimc:'rgba(35,35,35,.92)' },
  ps2:    { r:.70,  d:.075, spine:'#0a0a0a', txt:'#8fb0ff', rim:.03, rimc:'#0d0d0d' },
  psp:    { r:.58,  d:.08, spine:'#dcdcdc', txt:'#333',    rim:.025, rimc:'rgba(225,225,225,.92)' },
  pc:     { r:.667, d:.1,  spine:'#1b2838', txt:'#66c0f4', rim:.02, rimc:'#171a21' },
  ps3:    { r:.81,  d:.07, spine:'#10295c', txt:'#fff',    rim:.025, rimc:'#1c3f86' },
};
const ratioCache = {};
function spineLogo(url, my) {   // logo do SteamGridDB na lateral, só depois de carregada (antes: texto)
  const u = cp(url);
  const sp0 = $('art').querySelector('.spine .spl'); if (sp0 && sp0.getAttribute('src') === u) { lastArt.logo = u; return; }   // já está na lombada
  loadImg(u).then(ok => { if (!ok || my !== artReq) return; const sp = $('art').querySelector('.spine'); if (!sp) return; sp.innerHTML = `<img class="spl" src="${esc(u)}" alt="">`; lastArt.logo = u; });
}
function loadRatio(url) { return new Promise(ok => { const i = new Image(); i.onload = () => { const r = i.naturalWidth > 1 ? i.naturalWidth / i.naturalHeight : null; if (r) ratioCache[url] = r; ok(r); }; i.onerror = () => ok(null); i.src = url; }); }
let coverStyle2d = false;
function buildCase(g, url, back, ratio) {
  const base = CASES[sys.type === 'pc' ? 'pc' : sys.id] || { r:.72, d:.1, spine:'#222', txt:'#ddd', rim:0 };
  const gen = base.txt;   // cor da capa genérica
  const c = Object.assign({}, base, { spine:'#0b0b0b', txt:'#fff', rimc:'#0b0b0b', rim: base.rim || .02 });
  if (url && ratio) c.r = Math.max(.45, Math.min(2.2, ratio));   // formato real da capa (varia por país/versão)   // bordas pretas, texto branco
  const area = $('art').getBoundingClientRect();
  const small = area.width < 400, fh = small ? .8 : .52, fw = small ? .78 : .45;
  const H = Math.max(60, Math.min(area.height * fh, area.width * fw / c.r)), W = H * c.r, D = Math.max(small ? 8 : 14, H * Math.max(c.d, .12));
  const rim = c.rim ? Math.max(1, Math.round(H * c.rim / 2)) : 0;   // borda preta da frente (metade da original)
  const R = Math.max(5, Math.round(H * .035));          // raio das quinas (igual na frente, atrás e nas laterais)
  const px = v => v.toFixed(2) + 'px';
  const face = (cls, w, h, tf, style, html) => `<div class="face ${cls}" style="width:${px(w)};height:${px(h)};left:${px((W - w) / 2)};top:${px((H - h) / 2)};transform:${tf};${style}">${html || ''}</div>`;
  const fs = Math.max(9, D * .36);
  // título da lateral: já desenhado junto com a capa quando a logo é conhecida (mesma velocidade da frente); o texto fica até a imagem carregar
  const ca = cachedArt(g), lg = covers['logo|' + coverKey(g)] || (ca && ca.logo);
  const spineHtml = `<span style="color:var(--etxt, ${c.txt});font-size:${px(fs)}">${esc(cleanTitle(dn(g)) || dn(g))}</span>` +
    (lg ? `<img class="spl" src="${esc(cp(lg))}" alt="" style="opacity:0" onload="this.style.opacity=1;const t=this.previousElementSibling;if(t)t.remove()" onerror="this.remove()">` : '');
  // capa genérica: degradê com cor própria de cada jogo (pelo nome), brilhos suaves e textura leve
  const hh = genHash(dn(g)), hue = hh % 360, hue2 = (hue + 40 + (hh >> 8) % 60) % 360;
  const coverStyle = `background:radial-gradient(120% 80% at 15% 10%, hsla(${hue2},90%,65%,.55), transparent 60%), radial-gradient(90% 70% at 90% 95%, hsla(${hue},85%,55%,.5), transparent 65%), linear-gradient(155deg, hsl(${hue},55%,22%) 0%, hsl(${hue2},45%,12%) 60%, #07080d 100%);`;
  const tex = url ? `<div style="position:absolute;inset:0;background:url('${url.replace(/'/g, "%27")}') center/cover no-repeat"></div>` : '';
  const inner = `<div class="generic" style="position:absolute;inset:0;color:#fff"><div class="gx"></div><div class="glg"><img class="lg" src="${logoUrl(sys)}" alt=""></div><img class="ct" src="${ART}controllers/${sys.art}.svg" alt=""><div class="gb"><div class="gt" style="font-size:${px(Math.max(13, W * .095))}">${esc(cleanTitle(dn(g)) || dn(g))}</div><div class="gs" style="font-size:${px(Math.max(8, W * .038))}">${esc(sys.name || '')}</div></div></div>`;
  const edge = 'var(--edge, #0b0b0b)';   // cor principal da capa (calculada da imagem), preto enquanto não sabe
  if (coverStyle2d) {   // 2D: encarte esticado — lombada (logo/nome deitados) encostada na frente, moldura preta
    const S = Math.max(small ? 14 : 22, W * .11), F = Math.max(4, Math.round(H * .025));
    return `<div class="cw c2d"><div class="flip${back ? ' back' : ''}"><div class="flat2d" style="--fr:${F}px">` +
      `<div class="spine" style="width:${px(S)};height:${px(H)};--sh:${px(H * .85)};--sw:${px(S * .8)}"><span style="color:#fff;font-size:${px(Math.max(9, S * .42))}">${esc(cleanTitle(dn(g)) || dn(g))}</span></div>` +
      `<div class="front" style="width:${px(W)};height:${px(H)}"><div style="position:absolute;inset:0;${coverStyle}"></div>${inner}${tex}</div>` +
      `</div></div></div>`;
  }
  const rimStyle = `border:${rim}px solid var(--edge, ${c.rimc});box-sizing:border-box;border-radius:${R}px;`;
  // quinas arredondadas: fatias finas formando um quarto de cilindro em cada canto, unindo frente, laterais, topo e fundo
  let corners = '';
  const N = 8, seg = (Math.PI * R / 2) / N + 1.5, O = 2;   // O = sobreposição para não sobrar fresta entre as faces
  [[R, R, 180], [W - R, R, 270], [W - R, H - R, 0], [R, H - R, 90]].forEach(([cx, cy, a0]) => {
    for (let k = 0; k < N; k++) {
      const th = (a0 + (k + .5) * 90 / N) * Math.PI / 180;
      const x = cx + R * Math.cos(th) - W / 2, y = cy + R * Math.sin(th) - H / 2;
      const shade = .55 + .45 * Math.max(0, Math.cos(th - Math.PI * 1.25));
      corners += face('corner', seg, D + O, `translate3d(${px(x)},${px(y)},0) rotateZ(${(th * 180 / Math.PI + 90).toFixed(2)}deg) rotateX(90deg)`, `background:${edge};backface-visibility:visible;`);
    }
  });
  return `<div class="cw" style="transform:${scaleTf()}"><div class="rot" style="transform:${viewTf()};transform-style:preserve-3d"><div class="flip${back ? ' back' : ''}"><div class="case3d" style="width:${px(W)};height:${px(H)}">` +
    face('front', W, H, `translateZ(${px(D / 2)})`, rimStyle + `background-color:var(--edge, ${c.rimc});`, `<div style="position:absolute;inset:0;background-size:cover;background-position:center;${coverStyle}"></div>${inner}${tex}`) +
    face('back', W, H, `rotateY(180deg) translateZ(${px(D / 2)})`, `background:${edge};border-radius:${R}px;`) +
    face('spine', D + O, H - 2 * R + O, `rotateY(-90deg) translateZ(${px(W / 2)})`, `--sh:${px((H - 2 * R) * .85)};--sw:${px(D * .8)};background:${edge};`, spineHtml) +
    face('side', D + O, H - 2 * R + O, `rotateY(90deg) translateZ(${px(W / 2)})`, `background:${edge};`) +
    face('top', W - 2 * R + O, D + O, `rotateX(90deg) translateZ(${px(H / 2)})`, `background:${edge};`) +
    face('bottom', W - 2 * R + O, D + O, `rotateX(-90deg) translateZ(${px(H / 2)})`, `background:${edge};`) +
    corners +
    [-.25, 0, .25].map(z => face('core', W - 2, H - 2, `translateZ(${px(D * z)})`, `background:${edge};border-radius:${R}px;backface-visibility:visible;`)).join('') +
    `</div></div></div></div>`;
}
let artReq = 0, lastArt = null;
// fundo automático do jogo (quando a capa não trouxe um): SteamGridDB (heroes) > Steam (library_hero) > tela/título do jogo (libretro)
const bgFind = {};
async function findBg(g) {
  const key = 'bga|' + coverKey(g);
  if (key in bgFind) return bgFind[key];
  if (cacheOn && artDisk[key]) return bgFind[key] = artDisk[key].snap || null;
  return bgFind[key] = (async () => {
    const s = (typeof sysOf === 'function' && sysOf(g)) || sys || {}, q = cleanTitle(dn(g)) || dn(g);
    let u = null;
    try { if (sgdbOn) { const id = await sgdbGame(g); if (id) { const h = await sg(`/api/v2/heroes/game/${id}?${STATIC}`).catch(() => []); if (h[0]) u = h[0].url; } } } catch (e) {}
    if (!u) try { const m = (await idCovers(g).catch(() => []) || []).map(x => (x || '').match(/steam\/apps\/(\d+)/)).find(Boolean); if (m) u = await firstOk([`${STEAM}${m[1]}/library_hero.jpg`]); } catch (e) {}
    if (!u && s.thumbs) try { await loadThumbIndex(s); const b = boxartUrls(s, g.name); const alt = []; b.forEach(x => alt.push(x.replace('/Named_Boxarts/', '/Named_Snaps/'), x.replace('/Named_Boxarts/', '/Named_Titles/'))); u = await firstOk(alt); } catch (e) {}
    if (!u) try { const it = (await steamSearch(q)).map(x => ({ x, ...relevance(q, x.name) })).filter(x => x.phrase || x.overlap >= .8).sort((a, b) => (b.phrase - a.phrase) || (b.overlap - a.overlap))[0]; if (it) u = await firstOk([`${STEAM}${it.x.id}/library_hero.jpg`]); } catch (e) {}
    if (cacheOn) { artDisk[key] = { snap: u || '', src: 'bg' }; api('/api/artcache', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, val: artDisk[key] }) }).catch(() => {}); }
    return bgFind[key] = u;
  })();
}

// enquanto houver capa genérica na tela, continua procurando a imagem de verdade (a cada 3 s; só o que está visível)
setInterval(() => {
  if (document.hidden || (typeof gameOn !== 'undefined' && gameOn)) return;
  if (typeof screen === 'undefined') return;
  if (screen === 'games' && typeof shown !== 'undefined') {
    const g = shown[gIdx];
    if (g && lastArt && lastArt.g === g && !lastArt.url && !covers[coverKey(g)]) resolveArt(g, true).then(a => { if (a && a.box && shown[gIdx] === g && screen === 'games') showArt(g); });
  } else if (screen === 'favgrid' && typeof fgArt === 'function') {
    [...document.querySelectorAll('#fgTrack .fgcard:not(.has)')].slice(0, 4).forEach(el => fgArt(+el.dataset.i, el));
  }
}, 3000);
