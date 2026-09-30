// PlayLoop — core.js
const ART = 'https://raw.githubusercontent.com/fabricecaruso/es-theme-carbon/master/art/';
const THUMBS = 'https://raw.githubusercontent.com/libretro-thumbnails/';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSize = b => b > 1e9 ? (b/1e9).toFixed(2)+' GB' : b > 1e6 ? (b/1e6).toFixed(1)+' MB' : Math.max(1,Math.round(b/1e3))+' KB';
let systems = [], sysIdx = 0, sys = null, games = [], shown = [], gIdx = 0, screen = 'systems';
const gameCache = {}, thumbIndex = {};

async function api(url, opts) { const r = await fetch(url, opts); const t = await r.text(); const d = t ? JSON.parse(t) : []; if (!r.ok) throw new Error(d.error || r.status); return d; }
function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 3500); }
const BUILTIN_LOGOS = { fav: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20560%20120%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22f%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23ffd84a%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23ff8a00%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20d%3D%22M60%208l15%2031%2034%205-25%2024%206%2034-30-16-30%2016%206-34-25-24%2034-5z%22%20fill%3D%22url%28%23f%29%22/%3E%3Ctext%20x%3D%22130%22%20y%3D%2284%22%20font-family%3D%22Segoe%20UI%20Variable%20Display%2CSegoe%20UI%2CArial%2Csans-serif%22%20font-weight%3D%22800%22%20font-size%3D%2262%22%20letter-spacing%3D%223%22%20fill%3D%22%23161616%22%3EFAVORITOS%3C/text%3E%3C/svg%3E', pc: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20540%20120%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%237c3aed%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2306b6d4%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20x%3D%224%22%20y%3D%2210%22%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2226%22%20fill%3D%22url%28%23g%29%22/%3E%3Crect%20x%3D%2225%22%20y%3D%2233%22%20width%3D%2258%22%20height%3D%2239%22%20rx%3D%226%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%227%22/%3E%3Crect%20x%3D%2245%22%20y%3D%2277%22%20width%3D%2218%22%20height%3D%228%22%20rx%3D%222%22%20fill%3D%22%23fff%22/%3E%3Crect%20x%3D%2235%22%20y%3D%2286%22%20width%3D%2238%22%20height%3D%227%22%20rx%3D%223.5%22%20fill%3D%22%23fff%22/%3E%3Ctext%20x%3D%22128%22%20y%3D%2285%22%20font-family%3D%22Segoe%20UI%20Variable%20Display%2CSegoe%20UI%2CArial%2Csans-serif%22%20font-weight%3D%22800%22%20font-size%3D%2264%22%20letter-spacing%3D%223%22%20fill%3D%22%23161616%22%3EPC%20GAMES%3C/text%3E%3C/svg%3E', pc2: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20540%20120%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22h%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%220%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23ff2d75%22/%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%238b5cf6%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2300d4ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20d%3D%22M20%2030h86l-8%2060H12z%22%20fill%3D%22url%28%23h%29%22/%3E%3Cpath%20d%3D%22M40%2048h46M34%2062h46M28%2076h46%22%20stroke%3D%22%23fff%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22/%3E%3Ctext%20x%3D%22128%22%20y%3D%2284%22%20font-family%3D%22Segoe%20UI%20Variable%20Display%2CSegoe%20UI%2CArial%2Csans-serif%22%20font-style%3D%22italic%22%20font-weight%3D%22900%22%20font-size%3D%2266%22%20fill%3D%22url%28%23h%29%22%3EPC%20GAMING%3C/text%3E%3C/svg%3E' };
function bgUrlOf(s) {
  const b = s.bg || '';
  if (b.startsWith('art:')) return `${ART}background/${b.slice(4)}.jpg`;
  return b || `${ART}background/${s.art}.jpg`;
}
function logoUrl(s) {
  const l = s.logo || (s.type === 'pc' ? 'builtin:pc' : '');
  if (l.startsWith('builtin:')) return BUILTIN_LOGOS[l.slice(8)] || BUILTIN_LOGOS.pc;
  if (l.startsWith('art:')) return `${ART}logos/${l.slice(4)}.svg`;
  if (/^https?:|^data:|^\/api\//.test(l)) return l;
  return `${ART}logos/${s.art}.svg`;
}
function logo(s) { return `<img src="${logoUrl(s)}" alt="${esc(s.name)}" onerror="this.outerHTML='<div class=fallback>${esc(s.name)}</div>'">`; }
function show(id) { screen = id; document.querySelectorAll('.screen').forEach(e => e.classList.toggle('on', e.id === id)); }
