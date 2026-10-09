// Koru — main.js
/* ---------- início ---------- */
(async () => {
  try {
    if (location.pathname === '/welcome' || (await api('/api/setup')).needed) { runWelcome(); return; }
    allSystems = await api('/api/consoles');
    try { covers = await api('/api/covers') || {}; } catch (e) { covers = {}; }
    if (typeof vidVolLoad === 'function') { vidVolLoad(); if (window.vidVolPaint) window.vidVolPaint(); }   // volume do vídeo salvo
    // capas antigas só do card dos Favoritos ('fimg|') passam a ser a capa única do jogo
    Object.keys(covers).filter(k => k.startsWith('fimg|')).forEach(k => {
      const base = k.slice(5), post = (key, url) => api('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, url }) }).catch(() => {});
      if (!covers[base]) { covers[base] = covers[k]; post(base, covers[k]); }
      delete covers[k]; post(k, '');
    });
    try { const ci = await api('/api/cache/info'); bgKind = ci.bgMode || 'video'; coverStyle2d = ci.coverStyle === '2d'; favGridDim = (ci.favGrid === '6x12' ? '6x14' : ci.favGrid) || '4x12'; favBgGame = ci.favBgGame !== false; applyTheme(ci.theme); favConsoleOn = ci.favConsole !== false; const fc = ci.fav || {}; if (fc.enabled === false) favConsoleOn = false; if (fc.logo) FAVSYS.logo = fc.logo; if (fc.bg) FAVSYS.bg = fc.bg; sgdbOn = !!ci.sgdb; cacheOn = ci.enabled; if (cacheOn) artDisk = await api('/api/artcache') || {}; } catch (e) { cacheOn = false; }
    try { const h = await api('/api/hidden'); hidden = new Set(Array.isArray(h) ? h : []); } catch (e) {}
    const h = location.hash.slice(1);
    applyCustom(); show('systems'); if (!h && location.pathname !== '/config') bootAnim(); checkFavFiles();
    if (h === 'config' || location.pathname === '/config') openConfig(); else if (h && systems.some(s => s.id === h)) openSystem(h);
  } catch (e) { document.body.innerHTML = `<div class="empty" style="padding:60px">Não foi possível falar com o servidor local (${esc(e.message)}). Abra o "Koru" pela Área de Trabalho ou pelo menu Iniciar.</div>`; }
})();

/* ---------- Tradutor de Tela ---------- */
async function openTradutor() {
  sfx('ok');
  try { const r = await api('/api/tradutor', { method:'POST' }); if (r && r.ok) toast('Abrindo o Tradutor de Tela...'); else toast((r && r.msg) || 'Não foi possível abrir o Tradutor de Tela', true); } catch (e) { toast(e.message, true); }
}
(() => {
  const b = $('trBtn'); if (!b) return; b.onclick = openTradutor;
  const HELLO = { pt: 'Olá!', en: 'Hello!', es: '¡Hola!' };
  let t1 = 0, t2 = 0; const el = $('trHello');
  const show = () => { clearTimeout(t1); clearTimeout(t2); el.classList.remove('out'); el.textContent = 'こんにちは！';
    t1 = setTimeout(() => { el.classList.add('out'); t2 = setTimeout(() => { el.textContent = HELLO[LANG] || HELLO.pt; el.classList.remove('out'); }, 450); }, 2000); };
  b.parentNode.addEventListener('mouseenter', show);
  new MutationObserver(() => { if (b.classList.contains('padsel')) show(); }).observe(b, { attributes:true, attributeFilter:['class'] });
})();
