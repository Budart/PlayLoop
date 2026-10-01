// PlayLoop — input.js
/* ---------- modo TV de tubo ---------- */
let crtOn = false; try { crtOn = localStorage.getItem('crt') === '1'; } catch (e) {}
const TV_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 4 4-4"/><rect x="2" y="7" width="20" height="14" rx="4"/><rect x="5" y="10" width="11" height="8" rx="2.5"/><circle cx="19" cy="12" r=".8"/><circle cx="19" cy="15.5" r=".8"/></svg>', MON_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg>';
function setCrt(on) {
  crtOn = on; document.body.classList.toggle('crt', on);
  $('crtBtn').innerHTML = on ? MON_ICO : TV_ICO; $('crtBtn').title = on ? 'Voltar ao layout de monitor' : 'Layout para TV de tubo (CRT)';
  try { localStorage.setItem('crt', on ? '1' : '0'); } catch (e) {}
  if (screen === 'systems' && systems.length) selectSystem(sysIdx);
  if (lastArt && screen === 'games') $('art').innerHTML = buildCase(lastArt.g, lastArt.url, false, lastArt.ratio);
}
$('crtBtn').onclick = () => { setCrt(!crtOn); sfx('ok'); $('crtBtn').blur(); };
setCrt(crtOn);

/* ---------- controles: teclado + gamepad ---------- */
function input(a) {
  if (askOpen) { if (a === 'ok') askDone(true); else if (a === 'back') askDone(false); return; }
  if ($('ctx').classList.contains('on')) { if (a === 'down') ctxMove(1); else if (a === 'up') ctxMove(-1); else if (a === 'ok') ctxOk(); else if (a === 'back' || a === 'menu') closeCtx(); return; }
  if (modalOpen) { if (a === 'back') closeCover(); return; }
  if (fp.open) { fpInput(a); return; }
  if (fgInfoOpen) { if (a === 'back') fgInfo(false); else if (a === 'ok') launch(); return; }
  if (screen === 'config') { if (a === 'back' || a === 'start') $('cfCancel').onclick(); return; }
  if (a === 'start') { openConfig(); return; }
  if (a === 'select') { setCrt(!crtOn); return; }
  if (screen === 'favgrid') { fgInput(a); return; }
  if (screen === 'systems') {
    if (a === 'left') selectSystem(sysIdx - 1); else if (a === 'right') selectSystem(sysIdx + 1);
    else if (a === 'ok') openSystem();
  } else {
    if (a === 'up') selectGame(gIdx - 1); else if (a === 'down') selectGame(gIdx + 1);
    else if (a === 'pgup' || a === 'left') selectGame(gIdx - 10); else if (a === 'pgdn' || a === 'right') selectGame(gIdx + 10);
    else if (a === 'home') selectGame(0); else if (a === 'end') selectGame(shown.length - 1);
    else if (a === 'ok') launch(); else if (a === 'back') back(); else if (a === 'cover') openCover();
    else if (a === 'fav' && shown[gIdx]) toggleFav(shown[gIdx]);
    else if (a === 'menu' && shown[gIdx]) { ensureVisible(gIdx); const el = $('list').querySelector('.row.cur'); const r = el ? el.getBoundingClientRect() : $('list').getBoundingClientRect(); openCtx(shown[gIdx], r.left + 60, r.bottom); ctxMove(1); }
  }
}
document.addEventListener('keydown', e => {
  if (askOpen) { if (e.key === 'Escape') { e.preventDefault(); askDone(false); } return; }
  if ($('ctx').classList.contains('on')) { e.preventDefault(); if (e.key === 'ArrowDown') ctxMove(1); else if (e.key === 'ArrowUp') ctxMove(-1); else if (e.key === 'Enter') ctxOk(); else if (e.key === 'Escape') closeCtx(); return; }
  if (e.key === 'F1') { e.preventDefault(); if (screen !== 'config' && screen !== 'welcome') { if (modalOpen) closeCover(); openConfig(); } return; }
  if (screen === 'welcome' || renaming) return;
  if (fp.open) { const k = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Enter:'ok', Escape:'back', PageUp:'pgup', PageDown:'pgdn', '+':'pgdn', '-':'pgup' }[e.key]; if (k) { e.preventDefault(); fpInput(k); } return; }
  if (fgInfoOpen && !modalOpen) { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); fgInfo(false); } else if (e.key === 'Enter') { e.preventDefault(); launch(); } return; }
  if (screen === 'favgrid' && !modalOpen && e.key === 'Backspace') { e.preventDefault(); back(); return; }
  if (screen === 'favgrid' && !modalOpen && e.key === ' ') { e.preventDefault(); fgInput('fav'); return; }   // Espaço = □ (mover card)
  if (e.key === 'F2' && screen === 'games' && shown[gIdx]) { e.preventDefault(); startRename(gIdx); return; }
  if (screen === 'config') { if (e.key === 'Escape') $('cfCancel').onclick(); return; }
  if (modalOpen) { if (e.key === 'Escape') { e.preventDefault(); closeCover(); } return; }
  if (e.key === 'Escape' && screen === 'games' && clearMulti()) { e.preventDefault(); return; }   // Esc limpa a seleção em lote
  const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Enter:'ok', Escape:'back', PageUp:'pgup', PageDown:'pgdn', Home:'home', End:'end' };
  const inSearch = document.activeElement === $('q');
  if (map[e.key] && !(inSearch && ['left','right','home','end'].includes(map[e.key]))) {
    if (inSearch && e.key === 'Escape' && $('q').value) { $('q').value = ''; filter(); e.preventDefault(); return; }
    e.preventDefault(); if (inSearch && map[e.key] === 'back') $('q').blur(); input(map[e.key]); return;
  }
  if (screen === 'systems' && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); openGlobal(e.key); return; }
  if (e.key === 'Backspace' && screen === 'games' && !inSearch) { e.preventDefault(); back(); return; }
  if (screen === 'games' && !inSearch && e.key.length === 1 && !e.ctrlKey && !e.altKey) { $('q').focus(); }
});
$('q').oninput = filter;
$('homeBtn').onclick = () => { $('homeBtn').blur(); back(); };
const sortLbl = () => $('sortBtn').textContent = '⇅ ' + (SORTS.find(x => x[0] === sortMode) || SORTS[0])[1];
function renderSortMenu() { $('sortMenu').innerHTML = SORTS.map(([k, l]) => `<div class="sopt${k === sortMode ? ' sel' : ''}" data-s="${k}">${k === sortMode ? '✓ ' : ''}${l}</div>`).join(''); $('sortMenu').querySelectorAll('.sopt').forEach(el => el.onclick = e => { e.stopPropagation(); setSort(el.dataset.s); }); }
function setSort(k) { sortMode = k; try { localStorage.setItem('sort', k); } catch (e) {} sortLbl(); $('sortMenu').classList.remove('on'); sfx('tick'); refilterKeep(); }
$('sortBtn').onclick = e => { e.stopPropagation(); renderSortMenu(); $('sortMenu').classList.toggle('on'); sfx('tick'); $('sortBtn').blur(); };
document.addEventListener('click', () => $('sortMenu').classList.remove('on'));
sortLbl();

$('gq').oninput = () => { const v = $('gq').value; $('gq').value = ''; if (v.trim()) openGlobal(v); };
$('prev').onclick = () => selectSystem(sysIdx - 1); $('next').onclick = () => selectSystem(sysIdx + 1);
document.addEventListener('wheel', e => { if (screen === 'systems') selectSystem(sysIdx + (e.deltaY > 0 ? 1 : -1)); }, { passive:true });
// gamepad (Xbox/PS): D-pad/analógico, A = entrar/jogar, B = voltar
let padPrev = {}, padRepeat = 0;
function pollPad() {
  const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  // Xbox / DualSense / genéricos (mapeamento padrão): A/✕ ok · B/○ voltar · X/□ favoritar · Y/△ menu · LB/RB pular · Start configuração · Select modo TV
  if (p && !renaming && screen !== 'welcome') {
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, b = i => p.buttons[i] && p.buttons[i].pressed;
    const st = { up: b(12) || ay < -.6, down: b(13) || ay > .6, left: b(14) || ax < -.6, right: b(15) || ax > .6, ok: b(0), back: b(1), fav: b(2), menu: b(3), pgup: b(4), pgdn: b(5), select: b(8), start: b(9) };
    const now = performance.now();
    for (const k in st) {
      if (st[k] && !padPrev[k]) { input(k); padRepeat = now + 380; }
      else if (st[k] && ['up','down','left','right'].includes(k) && now > padRepeat) { input(k); padRepeat = now + 70; }
    }
    padPrev = st;
  }
  requestAnimationFrame(pollPad);
}
requestAnimationFrame(pollPad);
