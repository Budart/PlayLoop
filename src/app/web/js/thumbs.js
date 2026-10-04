// Koru — thumbs.js
/* ---------- capas (libretro-thumbnails, carregadas da internet) ---------- */
const key = s => s.replace(/\.(png|jpg)$/i, '').replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ').toLowerCase()
                  .replace(/^\s*the\s+/, '').replace(/,\s*the\b/g, '').replace(/&|_/g, ' and ').replace(/[^a-z0-9]/g, '').replace(/and/g, '');
const rank = n => (/\(USA|\(World/.test(n) ? 0 : /\(Brazil/.test(n) ? 1 : /\(Europe/.test(n) ? 2 : /\(Japan/.test(n) ? 3 : 4) + (/Beta|Proto|Demo|Sample|Kiosk|Rev /.test(n) ? 10 : 0);
// índice de nomes da libretro por console: baixado uma vez (todos esperam o mesmo download) e guardado no PC por 7 dias
const thumbIdxP = {};
function thumbIdxBuild(names) {
  const map = new Map();
  for (const p of names) { const k = key(p); if (!k) continue; const cur = map.get(k); if (!cur || rank(p) < rank(cur)) map.set(k, p); }
  return { map, keys: [...map.keys()], names };
}
function loadThumbIndex(s) {
  if (!s || !s.thumbs) return Promise.resolve();
  const r = s.thumbs; if (thumbIndex[r] && !thumbIndex[r].loading) return Promise.resolve();
  if (thumbIdxP[r]) return thumbIdxP[r];
  thumbIndex[r] = { loading: true };
  return thumbIdxP[r] = (async () => {
    try { const c = JSON.parse(localStorage.getItem('tidx|' + r) || 'null'); if (c && c.names && Date.now() - c.t < 7 * 864e5) { thumbIndex[r] = thumbIdxBuild(c.names); return; } } catch (e) {}
    try {
      const root = await (await fetch(`https://api.github.com/repos/libretro-thumbnails/${r}/contents/`)).json();
      const dir = root.find(e => e.name === 'Named_Boxarts');
      const tree = await (await fetch(`https://api.github.com/repos/libretro-thumbnails/${r}/git/trees/${dir.sha}`)).json();
      const names = tree.tree.map(e => e.path);
      thumbIndex[r] = thumbIdxBuild(names);
      try { localStorage.setItem('tidx|' + r, JSON.stringify({ t: Date.now(), names })); } catch (e) {}
    } catch (e) { thumbIndex[r] = { failed: true }; }
    delete thumbIdxP[r];
  })();
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
    if (!hit) {   // por palavras: todas as palavras importantes do nome aparecem no arquivo (pega hacks/traduções renomeados)
      const ws = name.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !/^(the|and|of|br|ptbr|hack|rev)$/.test(w));
      if (ws.length) { let best = null; for (const n of idx.names) { const l = n.toLowerCase(); if (ws.every(w => l.includes(w)) && (!best || rank(n) < rank(best) || (rank(n) === rank(best) && n.length < best.length))) best = n; } hit = best; }
    }
    return hit ? [base + encodeURIComponent(hit)] : [];
  }
  // sem índice (ex.: limite do GitHub): tenta nomes comuns
  const clean = name.replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[&*/:`<>?\\|]/g, '_').replace(/\s+/g, ' ').trim();
  return ['(USA)', '(USA, Europe)', '(World)', '(Europe)', '(Japan)'].map(r => base + encodeURIComponent(`${clean} ${r}.png`));
}
