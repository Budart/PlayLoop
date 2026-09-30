// PlayLoop — thumbs.js
/* ---------- capas (libretro-thumbnails, carregadas da internet) ---------- */
const key = s => s.replace(/\.(png|jpg)$/i, '').replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ').toLowerCase()
                  .replace(/^\s*the\s+/, '').replace(/,\s*the\b/g, '').replace(/&|_/g, ' and ').replace(/[^a-z0-9]/g, '').replace(/and/g, '');
const rank = n => (/\(USA|\(World/.test(n) ? 0 : /\(Brazil/.test(n) ? 1 : /\(Europe/.test(n) ? 2 : /\(Japan/.test(n) ? 3 : 4) + (/Beta|Proto|Demo|Sample|Kiosk|Rev /.test(n) ? 10 : 0);
async function loadThumbIndex(s) {
  if (!s.thumbs || thumbIndex[s.thumbs]) return;
  thumbIndex[s.thumbs] = { loading: true };
  try {
    const root = await (await fetch(`https://api.github.com/repos/libretro-thumbnails/${s.thumbs}/contents/`)).json();
    const dir = root.find(e => e.name === 'Named_Boxarts');
    const tree = await (await fetch(`https://api.github.com/repos/libretro-thumbnails/${s.thumbs}/git/trees/${dir.sha}`)).json();
    const map = new Map();
    for (const e of tree.tree) { const k = key(e.path); if (!k) continue; const cur = map.get(k); if (!cur || rank(e.path) < rank(cur)) map.set(k, e.path); }
    thumbIndex[s.thumbs] = { map, keys: [...map.keys()], names: tree.tree.map(e => e.path) };
  } catch (e) { thumbIndex[s.thumbs] = { failed: true }; }
}
function boxartUrls(s, name) {
  if (!s.thumbs) return [];
  const base = `${THUMBS}${s.thumbs}/master/Named_Boxarts/`;
  const idx = thumbIndex[s.thumbs];
  if (idx && idx.map) {
    const k = key(name);
    let hit = idx.map.get(k);
    if (!hit && k.length >= 5) {          // correspondência aproximada
      let best = null, diff = 1e9;
      for (const c of idx.keys) if ((c.startsWith(k) || k.startsWith(c)) && c.length >= 5 && Math.abs(c.length - k.length) < diff) { best = c; diff = Math.abs(c.length - k.length); }
      if (best) hit = idx.map.get(best);
    }
    return hit ? [base + encodeURIComponent(hit)] : [];
  }
  // sem índice (ex.: limite do GitHub): tenta nomes comuns
  const clean = name.replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[&*/:`<>?\\|]/g, '_').replace(/\s+/g, ' ').trim();
  return ['(USA)', '(USA, Europe)', '(World)', '(Europe)', '(Japan)'].map(r => base + encodeURIComponent(`${clean} ${r}.png`));
}
