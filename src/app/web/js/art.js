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
async function extraImage(g, order) {
  for (const k of order) {
    const repo = EXTRA_REPOS.find(r => r.key === k);
    for (const p of await repo.find(g)) if (await loadImg(p.img)) return { box: p.img, src: k };
  }
  return null;
}
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
async function steamArt(g) {
  const items = await steamSearch(cleanTitle(g.name)); if (!items.length) return null;
  const box = await firstOk(steamUrls(items[0].id)); if (!box) return null;
  return { box, snap: `${STEAM}${items[0].id}/library_hero.jpg` };
}
// cache de capas no computador (servidor guarda as imagens e o resultado da busca)
let cacheOn = true, artDisk = {};
const cp = u => (cacheOn && u && /^https?:/.test(u)) ? '/api/img?u=' + encodeURIComponent(u) : u;
// capa já conhecida (manual, memória ou cache em disco) — resposta imediata, sem esperar nada
function cachedArt(g) {
  const key = coverKey(g);
  if (covers[key]) return { box: covers[key], snap: null, src: 'manual', ratio: artDisk[key] && artDisk[key].ratio };
  if (artCache[key]) return artCache[key];
  if (cacheOn && artDisk[key] && !/^(wikipedia|wikiintl)$/.test(artDisk[key].src) && (sgdbOn || artDisk[key].src !== 'sgdb') && (!sgdbOn || artDisk[key].src === 'sgdb')) return artCache[key] = artDisk[key];   // ignora capas antigas da Wikipédia
  return null;
}
async function resolveArt(g) {
  const key = coverKey(g);
  const c = cachedArt(g); if (c) return c;
  const r = await resolveArt0(g);
  if (cacheOn && r && r.box && r.src !== 'manual') { artDisk[key] = r; api('/api/artcache', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, val: r }) }).catch(() => {}); }
  return r;
}
// mede a imagem (largura × altura); null se não carregar
const imgSize = (url, ms) => new Promise(ok => { const i = new Image(); const t = setTimeout(() => ok(null), ms || 6000);
  i.onload = () => { clearTimeout(t); ok(i.naturalWidth > 1 ? { url, px: i.naturalWidth * i.naturalHeight, ar: i.naturalWidth / i.naturalHeight } : null); }; i.onerror = () => { clearTimeout(t); ok(null); }; i.src = url; });
async function firstSized(urls) { for (const u of urls) { const r = await imgSize(u); if (r) return r; } return null; }
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
async function resolveArt0(g) {
  const key = coverKey(g);
  if (covers[key]) return { box: covers[key], snap: null, src: 'manual' };
  if (artCache[key]) return artCache[key];
  const q = cleanTitle(dn(g)) || dn(g);
  if (sgdbOn) { const a = await sgdbArt(g).catch(() => null); if (a && a.box) return artCache[key] = { ...a, src: 'sgdb' }; }
  // busca em todos os repositórios ao mesmo tempo; prioridade: nome exato > mais palavras em comum > maior resolução
  const tasks = [];
  const sized = async (src, list, trusted) => {   // list: [{url, title}]
    const out = [];
    for (const it of list) { const r = await imgSize(it.url); if (r) out.push({ ...r, src, title: it.title, ...(trusted ? { phrase: 1, overlap: 1 } : relevance(q, it.title)) }); }
    return out;
  };
  const add = (src, p, trusted) => tasks.push(p.then(list => sized(src, list || [], trusted)).catch(() => []));
  const repo = (k, n) => EXTRA_REPOS.find(r => r.key === k).find(g).then(l => l.slice(0, n || 3).map(p => ({ url: p.img, title: p.title })));
  const steam = n => steamSearch(q).then(items => Promise.all(items.slice(0, n).map(async it => { const u = await firstOk(steamUrls(it.id)); return u ? { url: u, title: it.name } : null; }))).then(l => l.filter(Boolean));
  const wiki = () => wikiMain(q, 2).then(l => l.map(p => ({ url: p.img, title: p.title })));
  const byId = () => idCovers(g).then(async urls => { const u = await firstOk(urls); return u ? [{ url: u, title: q }] : []; });
  if (sys.type === 'pc') {
    add('steam', byId(), true); add('steam', steam(3)); add('pcgw', repo('pcgw')); add('fandom', repo('fandom')); add('strategywiki', repo('strategywiki')); add('wikimain', wiki());
  } else {
    add('libretro', firstOk(boxartUrls(sys, g.name)).then(u => u ? [{ url: u, title: decodeURIComponent(u.split('/').pop()) }] : []));
    add('code', byId(), true);
    add('fandom', repo('fandom')); add('strategywiki', repo('strategywiki')); add('pcgw', repo('pcgw')); add('steam', steam(3)); add('wikimain', wiki());
  }
  // descarta resultados que batem só com parte do nome (ex.: "Elite" para "Elite Soccer")
  const found = [].concat(...(await Promise.all(tasks))).filter(c => c.phrase || c.overlap >= .6).sort(relCmp);
  const best = found[0];
  let box = best ? best.url : null, src = best ? best.src : 'generica', snap = null;
  if (src === 'code') src = /gametdb/.test(box) ? 'gametdb' : /steam/.test(box) ? 'steam' : 'xlenore';
  // imagem de fundo: tela do jogo (libretro) ou arte da Steam
  if (box && /Named_Boxarts/.test(box)) snap = await firstOk([box.replace('/Named_Boxarts/', '/Named_Snaps/'), box.replace('/Named_Boxarts/', '/Named_Titles/')]);
  else if (box && /steamstatic/.test(box)) snap = await firstOk([box.replace(/\/[^/]+$/, '/library_hero.jpg')]);
  if (!snap && sys.type !== 'pc') { const lib = found.find(f => f.src === 'libretro'); if (lib) snap = await firstOk([lib.url.replace('/Named_Boxarts/', '/Named_Snaps/')]); }
  return artCache[key] = { box, snap, src };
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
  const rim = c.rim ? Math.round(H * c.rim) : 0;
  const R = Math.max(5, Math.round(H * .035));          // raio das quinas (igual na frente, atrás e nas laterais)
  const px = v => v.toFixed(2) + 'px';
  const face = (cls, w, h, tf, style, html) => `<div class="face ${cls}" style="width:${px(w)};height:${px(h)};left:${px((W - w) / 2)};top:${px((H - h) / 2)};transform:${tf};${style}">${html || ''}</div>`;
  const fs = Math.max(9, D * .36);
  const spineHtml = `<span style="color:${c.txt};font-size:${px(fs)}">${esc(cleanTitle(dn(g)) || dn(g))}</span>`;
  const coverStyle = `background:linear-gradient(160deg, ${gen} -20%, ${base.spine} 55%, #000 130%);`;
  const tex = url ? `<div style="position:absolute;inset:0;background:url('${url.replace(/'/g, "%27")}') center/cover no-repeat"></div>` : '';
  const inner = `<div class="generic" style="position:absolute;inset:0;color:#fff"><img class="lg" src="${logoUrl(sys)}" alt=""><div class="gt" style="font-size:${px(Math.max(14, W * .085))}">${esc(cleanTitle(dn(g)) || dn(g))}</div><img class="ct" src="${ART}controllers/${sys.art}.svg" alt=""></div>`;
  const edge = '#0b0b0b';
  if (coverStyle2d) {   // 2D: encarte esticado — lombada (logo/nome deitados) encostada na frente, moldura preta
    const S = Math.max(small ? 14 : 22, W * .11), F = Math.max(4, Math.round(H * .025));
    return `<div class="cw c2d"><div class="flip${back ? ' back' : ''}"><div class="flat2d" style="--fr:${F}px">` +
      `<div class="spine" style="width:${px(S)};height:${px(H)};--sh:${px(H * .85)};--sw:${px(S * .8)}"><span style="color:#fff;font-size:${px(Math.max(9, S * .42))}">${esc(cleanTitle(dn(g)) || dn(g))}</span></div>` +
      `<div class="front" style="width:${px(W)};height:${px(H)}"><div style="position:absolute;inset:0;${coverStyle}"></div>${inner}${tex}</div>` +
      `</div></div></div>`;
  }
  const rimStyle = `border:${rim}px solid ${c.rimc};box-sizing:border-box;border-radius:${R}px;`;
  // quinas arredondadas: fatias finas formando um quarto de cilindro em cada canto, unindo frente, laterais, topo e fundo
  let corners = '';
  const N = 8, seg = (Math.PI * R / 2) / N + 1.5, O = 2;   // O = sobreposição para não sobrar fresta entre as faces
  [[R, R, 180], [W - R, R, 270], [W - R, H - R, 0], [R, H - R, 90]].forEach(([cx, cy, a0]) => {
    for (let k = 0; k < N; k++) {
      const th = (a0 + (k + .5) * 90 / N) * Math.PI / 180;
      const x = cx + R * Math.cos(th) - W / 2, y = cy + R * Math.sin(th) - H / 2;
      const shade = .55 + .45 * Math.max(0, Math.cos(th - Math.PI * 1.25));
      corners += face('corner', seg, D + O, `translate3d(${px(x)},${px(y)},0) rotateZ(${(th * 180 / Math.PI + 90).toFixed(2)}deg) rotateX(90deg)`, `background:${edge};filter:brightness(${shade.toFixed(2)});backface-visibility:visible;`);
    }
  });
  return `<div class="cw" style="transform:${scaleTf()}"><div class="rot" style="transform:${viewTf()};transform-style:preserve-3d"><div class="flip${back ? ' back' : ''}"><div class="case3d" style="width:${px(W)};height:${px(H)}">` +
    face('front', W, H, `translateZ(${px(D / 2)})`, rimStyle + `background-color:${c.rimc};`, `<div style="position:absolute;inset:0;background-size:cover;background-position:center;${coverStyle}"></div>${inner}${tex}`) +
    face('back', W, H, `rotateY(180deg) translateZ(${px(D / 2)})`, `background:${edge};border-radius:${R}px;filter:brightness(.6);`) +
    face('spine', D + O, H - 2 * R + O, `rotateY(-90deg) translateZ(${px(W / 2)})`, `--sh:${px((H - 2 * R) * .85)};--sw:${px(D * .8)};background:linear-gradient(90deg, rgba(0,0,0,.25), rgba(255,255,255,.08) 50%, rgba(0,0,0,.25)), ${edge};`, spineHtml) +
    face('side', D + O, H - 2 * R + O, `rotateY(90deg) translateZ(${px(W / 2)})`, `background:${edge};filter:brightness(.8);`) +
    face('top', W - 2 * R + O, D + O, `rotateX(90deg) translateZ(${px(H / 2)})`, `background:${edge};filter:brightness(1.1);`) +
    face('bottom', W - 2 * R + O, D + O, `rotateX(-90deg) translateZ(${px(H / 2)})`, `background:${edge};filter:brightness(.5);`) +
    corners +
    [-.25, 0, .25].map(z => face('core', W - 2, H - 2, `translateZ(${px(D * z)})`, `background:${edge};border-radius:${R}px;backface-visibility:visible;`)).join('') +
    `</div></div></div></div>`;
}
let artReq = 0, lastArt = null;
