// PlayLoop — main.js
/* ---------- início ---------- */
(async () => {
  try {
    if (location.pathname === '/welcome' || (await api('/api/setup')).needed) { runWelcome(); return; }
    allSystems = await api('/api/consoles');
    try { covers = await api('/api/covers') || {}; } catch (e) { covers = {}; }
    try { const ci = await api('/api/cache/info'); bgKind = ci.bgMode || 'video'; coverStyle2d = ci.coverStyle === '2d'; favGridDim = ci.favGrid || '4x12'; favConsoleOn = ci.favConsole !== false; const fc = ci.fav || {}; if (fc.enabled === false) favConsoleOn = false; if (fc.logo) FAVSYS.logo = fc.logo; if (fc.bg) FAVSYS.bg = fc.bg; sgdbOn = !!ci.sgdb; cacheOn = ci.enabled; if (cacheOn) artDisk = await api('/api/artcache') || {}; } catch (e) { cacheOn = false; }
    try { const h = await api('/api/hidden'); hidden = new Set(Array.isArray(h) ? h : []); } catch (e) {}
    const h = location.hash.slice(1);
    applyCustom(); show('systems'); checkFavFiles();
    if (h === 'config' || location.pathname === '/config') openConfig(); else if (h && systems.some(s => s.id === h)) openSystem(h);
  } catch (e) { document.body.innerHTML = `<div class="empty" style="padding:60px">Não foi possível falar com o servidor local (${esc(e.message)}). Abra o "PlayLoop" pela Área de Trabalho ou pelo menu Iniciar.</div>`; }
})();
