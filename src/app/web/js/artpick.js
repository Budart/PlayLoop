// Koru — artpick.js
/* ---------- "Mais...": escolher fundo/ícone de console entre todas as imagens do repositório do tema ---------- */
const ARTPICK = { open: false, kind: '', cb: null, items: [] };
const ARTLIST_SRC = {
  bg:   { gh: 'art/background', ext: /\.(jpg|jpeg|png)$/i, rp: 'background.jpg' },
  logo: { gh: 'art/logos',      ext: /\.(svg|png)$/i,      rp: 'system.svg' },
};
// lista de arquivos: API do GitHub (repositório principal) → jsDelivr → repositório RetroPie (uma pasta por console); guardada no PC
async function artList(kind) {
  const s = ARTLIST_SRC[kind], key = 'artlist|' + kind;
  try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 7 * 864e5 && c.items.length) return c.items; } catch (e) {}
  const save = items => { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), items })); } catch (e) {} return items; };
  try {
    const r = await fetch('https://api.github.com/repos/fabricecaruso/es-theme-carbon/contents/' + s.gh); if (!r.ok) throw 0;
    const items = (await r.json()).filter(f => f.type === 'file' && s.ext.test(f.name)).map(f => ({ name: f.name.replace(/\.[^.]+$/, ''), url: ART + s.gh.slice(4) + '/' + f.name }));
    if (items.length) return save(items);
  } catch (e) {}
  try {
    const r = await fetch('https://data.jsdelivr.com/v1/package/gh/fabricecaruso/es-theme-carbon@master/flat'); if (!r.ok) throw 0;
    const pre = '/' + s.gh + '/';
    const items = (await r.json()).files.filter(f => f.name.startsWith(pre) && !f.name.slice(pre.length).includes('/') && s.ext.test(f.name)).map(f => { const n = f.name.slice(pre.length); return { name: n.replace(/\.[^.]+$/, ''), url: ART + s.gh.slice(4) + '/' + n }; });
    if (items.length) return save(items);
  } catch (e) {}
  try {
    const r = await fetch('https://api.github.com/repos/RetroPie/es-theme-carbon/contents/'); if (!r.ok) throw 0;
    const items = (await r.json()).filter(f => f.type === 'dir' && !/^(art|_inc|\.)/.test(f.name)).map(f => ({ name: f.name, url: `https://raw.githubusercontent.com/RetroPie/es-theme-carbon/master/${f.name}/art/${s.rp}` }));
    if (items.length) return save(items);
  } catch (e) {}
  return ICON_ART.map(a => ({ name: a, url: kind === 'bg' ? `${ART}background/${a}.jpg` : `${ART}logos/${a}.svg` }));   // sem internet: a lista básica
}
async function openArtPick(kind, cb) {
  Object.assign(ARTPICK, { open: true, kind, cb, items: [] });
  $('apTitle').textContent = kind === 'bg' ? '🌄 Mais fundos de console' : '🎮 Mais ícones de console';
  $('apQ').value = ''; $('apGrid').innerHTML = '<div class="empty">Carregando a lista do repositório...</div>';
  $('artPick').classList.add('on'); sfx('ok');
  ARTPICK.items = await artList(kind); apRender();
}
function apRender() {
  const q = $('apQ').value.trim().toLowerCase(), list = ARTPICK.items.filter(i => !q || i.name.toLowerCase().includes(q));
  $('apMsg').textContent = `${list.length} imagens`;
  $('apGrid').className = 'icogrid ap' + (ARTPICK.kind === 'bg' ? ' bgs' : '');
  $('apGrid').innerHTML = list.map(i => `<div class="ico" data-u="${esc(i.url)}" tabindex="-1"><img src="${esc(i.url)}" alt="" loading="lazy"><span>${esc(i.name)}</span></div>`).join('') || '<div class="empty">Nada encontrado.</div>';
  $('apGrid').querySelectorAll('.ico').forEach(el => el.onclick = () => apPick(el.dataset.u));
}
function apPick(url) {
  const kind = ARTPICK.kind, m = url.startsWith(ART) && url.slice(ART.length).match(kind === 'bg' ? /^background\/([^/]+)\.jpg$/ : /^logos\/([^/]+)\.svg$/);
  closeArtPick(); if (ARTPICK.cb) ARTPICK.cb(m ? 'art:' + m[1] : url);   // do repositório principal: guarda o nome (com reserva automática)
}
function closeArtPick() { ARTPICK.open = false; $('artPick').classList.remove('on'); }
function apNav(dir) {
  const its = [...$('apGrid').querySelectorAll('.ico')]; if (!its.length) return;
  if (document.activeElement === $('apQ')) $('apQ').blur();
  let k = its.findIndex(e => e.classList.contains('kb'));
  const cols = Math.max(1, its.filter(e => e.offsetTop === its[0].offsetTop).length);
  k = k < 0 ? 0 : Math.max(0, Math.min(its.length - 1, k + (dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -cols : cols)));
  its.forEach((e, j) => e.classList.toggle('kb', j === k)); its[k].scrollIntoView({ block: 'nearest' }); sfx('tick');
}
function apInput(a) {
  if (['left','right','up','down'].includes(a)) apNav(a);
  else if (a === 'ok') { const el = $('apGrid').querySelector('.ico.kb'); if (el) el.click(); }
  else if (a === 'menu' || a === 'search') openOsk($('apQ'));
  else if (a === 'back') { closeArtPick(); sfx('back'); }
}
$('apQ').oninput = () => apRender();
$('apClose').onclick = () => { closeArtPick(); sfx('back'); };
$('artPick').onclick = e => { if (e.target === $('artPick')) closeArtPick(); };
