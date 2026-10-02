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

/* ---------- janelas de confirmação com o controle: D-pad escolhe o botão/link, ✕ aperta o que está em foco, ○ cancela ---------- */
function askItems() { return [...$('askModal').querySelectorAll('.emurec a, .mfoot button')].filter(e => e.offsetParent); }
function askPad(a) {
  const it = askItems(); if (!it.length) return;
  let k = it.indexOf(document.activeElement);
  if (a === 'back') { askDone(false); return; }
  if (a === 'ok') { (k >= 0 ? it[k] : $('askNo')).click(); return; }
  if (['left','right','up','down'].includes(a)) {
    k = k < 0 ? 0 : (k + ((a === 'left' || a === 'up') ? -1 : 1) + it.length) % it.length;
    it[k].focus(); sfx('tick');
  }
}
/* ---------- configuração com o controle: D-pad navega, ✕ ativa, ○ volta ao menu lateral / sai ---------- */
// cards (.ccard): o D-pad anda de card em card; ✕ entra no card e aí navega entre os campos dele; ○ sai do card
let cfgIn = null;
function cfgFocusables() {
  const sec = document.querySelector('#cfBody .cfsec.on'); if (!sec) return [];
  if (cfgIn && !sec.contains(cfgIn)) cfgIn = null;
  const all = [...(cfgIn || sec).querySelectorAll('.pick, input:not([type=radio]), textarea, button')].filter(e => e.offsetParent && !e.disabled && !e.closest('.pick') || e.classList.contains('pick'));
  if (cfgIn) return all;
  const out = []; all.forEach(e => { const c = e.closest('.ccard'); const it = c || e; if (!out.includes(it)) out.push(it); });
  return out;
}
function cfgMark(el) {
  document.querySelectorAll('#cfBody .kbf').forEach(e => e.classList.remove('kbf'));
  if (!el) return; el.classList.add('kbf'); if (el.tabIndex < 0 && !/INPUT|TEXTAREA|BUTTON/.test(el.tagName)) el.tabIndex = -1;
  el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' });
}
function cfgPad(a) {
  const nav = [...document.querySelectorAll('#cfBody .cfnav button')], cur = document.querySelector('#cfBody .kbf'), inNav = !cur || nav.includes(cur);
  if (a === 'start') { $('cfCancel').onclick(); return; }
  if (inNav) {
    cfgIn = null;
    if (!cur) { cfgMark(nav.find(b => b.classList.contains('on')) || nav[0]); return; }   // 1º toque: só mostra o foco
    const k = Math.max(0, nav.indexOf(cur) < 0 ? nav.findIndex(b => b.classList.contains('on')) : nav.indexOf(cur));
    if (a === 'up' || a === 'down') { const n = nav[Math.max(0, Math.min(nav.length - 1, k + (a === 'up' ? -1 : 1)))]; n.click(); cfgMark(n); }
    else if (a === 'right' || a === 'ok') { if (!cur) { cfgMark(nav[k]); return; } const f = cfgFocusables(); if (f.length) { cfgMark(f[0]); sfx('tick'); } }
    else if (a === 'back') $('cfCancel').onclick();
    return;
  }
  if (cfgIn && (a === 'back' || (a === 'left' && cur && cur.tagName !== 'INPUT' && cur.tagName !== 'TEXTAREA' && cfgFocusables().indexOf(cur) === 0))) { const c = cfgIn; cfgIn = null; cfgMark(c); sfx('back'); return; }
  if (a === 'ok' && cur && cur.classList.contains('ccard')) { cfgIn = cur; const f0 = cfgFocusables(); if (f0.length) cfgMark(f0[0]); sfx('ok'); return; }
  const f = cfgFocusables(), k = f.indexOf(cur);
  if (cur && cur.classList.contains('ccard') && ['left','right','up','down'].includes(a)) {   // cards lado a lado: anda pela posição na tela
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best = null, bd = 1e9;
    f.forEach(e => { if (e === cur) return; const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
      const ok = a === 'left' ? dx < -20 && Math.abs(dy) < r.height / 2 : a === 'right' ? dx > 20 && Math.abs(dy) < r.height / 2 : a === 'up' ? dy < -20 : dy > 20;
      if (!ok) return; const d = Math.abs(dx) * (a === 'up' || a === 'down' ? 2 : 1) + Math.abs(dy) * (a === 'left' || a === 'right' ? 2 : 1); if (d < bd) { bd = d; best = e; } });
    if (best) { cfgMark(best); sfx('tick'); } else if (a === 'left') { cfgMark(nav.find(b => b.classList.contains('on'))); sfx('back'); }
    return;
  }
  if (a === 'back' || (a === 'left' && !(cur.tagName === 'INPUT' && cur.type !== 'checkbox') && !cur.classList.contains('pick'))) { cfgMark(nav.find(b => b.classList.contains('on'))); sfx('back'); return; }
  if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
    // cartões ilustrados lado a lado: ←/→ andam entre eles; ↑/↓ andam na ordem da tela
    let j = k + ((a === 'up' || a === 'left') ? -1 : 1);
    if ((a === 'up' || a === 'down') && cur.classList.contains('pick')) { const row = cur.parentNode; while (f[j] && f[j].parentNode === row) j += a === 'up' ? -1 : 1; }
    if (a === 'left' && j < 0) { cfgMark(nav.find(b => b.classList.contains('on'))); return; }
    if (f[j]) { cfgMark(f[j]); sfx('tick'); }
    return;
  }
  if (a === 'ok') {
    if (cur.classList.contains('pick')) { const r = cur.querySelector('input'); if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } sfx('ok'); return; }
    if (cur.tagName === 'INPUT' && cur.type === 'checkbox') { cur.click(); sfx('ok'); return; }
    if (cur.tagName === 'BUTTON') { cur.click(); sfx('ok'); return; }
    openOsk(cur);   // campo de texto: abre o teclado virtual
  }
}
/* ---------- barra do topo na home (busca, config, som, TV) via ↑ ---------- */
let topSel = -1;
const TOP_IDS = ['gq', 'gear', 'mute', 'crtBtn'];
function topMark(i) {
  topSel = i; TOP_IDS.forEach((id, k) => $(id) && $(id).classList.toggle('padsel', k === i));
  if (i >= 0) sfx('tick');
}
function topInput(a) {
  if (a === 'left' && topSel > 0) topMark(topSel - 1);
  else if (a === 'right' && topSel < TOP_IDS.length - 1) topMark(topSel + 1);
  else if (a === 'down' || a === 'back') { topMark(-1); sfx('back'); }
  else if (a === 'ok') {
    const id = TOP_IDS[topSel]; topMark(-1);
    if (id === 'gq') { openGlobal(''); setTimeout(() => openOsk($('q')), 50); }
    else { $(id).click(); if (id !== 'gear') topMark(TOP_IDS.indexOf(id)); }
  }
}
document.addEventListener('mousedown', () => { if (topSel >= 0) topMark(-1); }, true);
/* ---------- controles: teclado + gamepad ---------- */
function input(a) {
  if (gameOn) return;   // jogo aberto: comandos só voltam quando ele fecha
  if (oskOpen) { oskInput(a); return; }
  if (ARTPICK.open) { apInput(a); return; }
  if (askOpen) { askPad(a); return; }
  if ($('ctx').classList.contains('on')) { if (a === 'down') ctxMove(1); else if (a === 'up') ctxMove(-1); else if (a === 'ok') ctxOk(); else if (a === 'back' || a === 'menu') closeCtx(); return; }
  if (modalOpen) { if (a === 'back') closeCover(); else if (['left','right','up','down'].includes(a)) coverNav(a); else if (a === 'ok') coverPick(); else if (a === 'menu') openOsk($('cq')); return; }
  if (fxOpen) { if (a === 'back') fgFxClose(); return; }
  if (fp.open) { fpInput(a); return; }
  if (fgInfoOpen) { if (a === 'back') fgInfo(false); else if (a === 'ok') { fgInfo(false); fgLaunch(); } return; }
  if (screen === 'config') { cfgPad(a); return; }
  if (a === 'start') { openConfig(); return; }
  if (a === 'select') { setCrt(!crtOn); return; }
  if (a === 'search') { if (screen === 'games') { $('q').focus(); openOsk($('q')); } else if (screen === 'systems' || screen === 'favgrid') { openGlobal(''); setTimeout(() => openOsk($('q')), 50); } return; }
  if (screen === 'favgrid') { fgInput(a); return; }
  if (screen === 'systems' && topSel >= 0) { topInput(a); return; }
  if (screen === 'systems') {
    if (a === 'up') { topMark(0); return; }
    if (a === 'left') selectSystem(sysIdx - 1); else if (a === 'right') selectSystem(sysIdx + 1);
    else if (a === 'ok') openSystem();
  } else {
    if (a === 'up') selectGame(gIdx - 1); else if (a === 'down') selectGame(gIdx + 1);
    else if (a === 'pgup' || a === 'left') selectGame(gIdx - 10); else if (a === 'pgdn' || a === 'right') selectGame(gIdx + 10);
    else if (a === 'home') selectGame(0); else if (a === 'end') selectGame(shown.length - 1);
    else if (a === 'ok') listLaunch(); else if (a === 'back') back(); else if (a === 'cover') openCover();
    else if (a === 'fav' && shown[gIdx]) toggleFav(shown[gIdx]);
    else if (a === 'menu' && shown[gIdx]) { ensureVisible(gIdx); const el = $('list').querySelector('.row.cur'); const r = el ? el.getBoundingClientRect() : $('list').getBoundingClientRect(); openCtx(shown[gIdx], r.left + 60, r.bottom); ctxMove(1); }
  }
}
document.addEventListener('keydown', e => {
  if (gameOn) { e.preventDefault(); return; }
  if (ARTPICK.open && !oskOpen) { const d = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Escape:'back' }[e.key]; const inQ = document.activeElement === $('apQ'); if (d && !(inQ && (d === 'left' || d === 'right'))) { e.preventDefault(); apInput(d); } else if (e.key === 'Enter' && !inQ) { e.preventDefault(); apInput('ok'); } return; }
  if (oskOpen) { if (e.key === 'Escape') { e.preventDefault(); closeOsk(false); } else if (e.key === 'Enter') { closeOsk(false); } else setTimeout(oskShow, 0); return; }
  if (askOpen) {
    if (e.key === 'Escape') { e.preventDefault(); askDone(false); return; }
    const d = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' }[e.key]; if (d) { e.preventDefault(); askPad(d); }
    return;   // Enter/Espaço apertam o botão em foco (comportamento nativo)
  }
  if ($('ctx').classList.contains('on')) { e.preventDefault(); if (e.key === 'ArrowDown') ctxMove(1); else if (e.key === 'ArrowUp') ctxMove(-1); else if (e.key === 'Enter') ctxOk(); else if (e.key === 'Escape') closeCtx(); return; }
  if (e.key === 'F1') { e.preventDefault(); if (screen !== 'config' && screen !== 'welcome') { if (modalOpen) closeCover(); openConfig(); } return; }
  if (screen === 'welcome' || renaming) return;
  if (fxOpen) { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); fgFxClose(); } return; }
  if (fp.open) { const k = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Enter:'ok', Escape:'back', PageUp:'pgup', PageDown:'pgdn', '+':'pgdn', '-':'pgup' }[e.key]; if (k) { e.preventDefault(); fpInput(k); } return; }
  if (fgInfoOpen && !modalOpen) { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); fgInfo(false); } else if (e.key === 'Enter') { e.preventDefault(); fgInfo(false); fgLaunch(); } return; }
  if (screen === 'favgrid' && !modalOpen && e.key === 'Backspace') { e.preventDefault(); back(); return; }
  if (screen === 'favgrid' && !modalOpen && (e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.altKey && fg.items[fg.sel]) { e.preventDefault(); fgInfo(true); return; }   // I = Info do card
  if (screen === 'favgrid' && !modalOpen && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); openGlobal(e.key); return; }   // digitar = busca geral
  if (screen === 'favgrid' && !modalOpen && e.key === ' ') { e.preventDefault(); fgInput('fav'); return; }   // Espaço = □ (mover card)
  if (e.key === 'F2' && screen === 'games' && shown[gIdx]) { e.preventDefault(); startRename(gIdx); return; }
  if (screen === 'config') {   // teclado igual ao D-pad: setas navegam, Tab = próximo (Shift+Tab = anterior), Enter ativa, Esc volta
    const ae = document.activeElement, typing = ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && !/checkbox|radio/.test(ae.type)));
    if (!document.querySelector('#cfBody .kbf') && ae && ae.closest && ae.closest('#cfBody')) cfgMark(ae.closest('.pick') || ae);   // começou com o mouse: segue dali
    const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Escape: 'back' }[e.key];
    if (e.key === 'Tab') { e.preventDefault(); cfgPad(e.shiftKey ? 'up' : 'down'); return; }
    if (m && !(typing && (m === 'left' || m === 'right'))) { e.preventDefault(); cfgPad(m); return; }
    if (e.key === 'Enter' && !typing) { e.preventDefault(); cfgPad('ok'); return; }
    return;
  }
  if (modalOpen) {
    if (e.key === 'Escape') { e.preventDefault(); closeCover(); return; }
    const inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
    const d = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' }[e.key];
    if (d && !(inInput && (d === 'left' || d === 'right'))) { e.preventDefault(); coverNav(d); return; }
    if (e.key === 'Enter' && !inInput && coverPick()) { e.preventDefault(); return; }
    return;
  }
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
  requestAnimationFrame(pollPad);   // agenda antes: um erro em qualquer tela nunca mais "desliga" o controle
  try { pollPad1(); } catch (e) { console.error('controle:', e); }
}
function pollPad1() {
  const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(g => g && g.connected !== false);
  if (typeof updatePadHelp === 'function') updatePadHelp(p);
  // Xbox / DualSense / genéricos (mapeamento padrão): A/✕ ok · B/○ voltar · X/□ favoritar · Y/△ menu · LB/RB pular · Start configuração · Select modo TV
  if (p && (!renaming || oskOpen) && screen !== 'welcome') {
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, b = i => p.buttons[i] && p.buttons[i].pressed;
    const st = { up: b(12) || ay < -.6, down: b(13) || ay > .6, left: b(14) || ax < -.6, right: b(15) || ax > .6, ok: b(0), back: b(1), fav: b(2), menu: b(3), pgup: b(4), pgdn: b(5), select: b(8), start: b(9), search: b(10) || b(11) };
    const now = performance.now();
    for (const k in st) {
      if (st[k] && !padPrev[k]) { lastInputPad = true; legendMode = 'pad'; input(k); padRepeat = now + 380; }
      else if (st[k] && ['up','down','left','right'].includes(k) && now > padRepeat) { input(k); padRepeat = now + 70; }
      // teclado virtual: segurar □ (apagar) ou ✕ sobre a tecla ⌫ apaga em sequência
      else if (st[k] && oskOpen && (k === 'fav' || (k === 'ok' && OSK_ROWS[oskSel[0]][oskSel[1]] === '⌫')) && now > padRepeat) { input(k); padRepeat = now + 60; }
    }
    padPrev = st;
    if (Object.values(st).some(Boolean)) legendMode = 'pad';
    // R2 / L2: aumenta / diminui a capa 3D
    const r2 = p.buttons[7] ? p.buttons[7].value || (p.buttons[7].pressed ? 1 : 0) : 0, l2 = p.buttons[6] ? p.buttons[6].value || (p.buttons[6].pressed ? 1 : 0) : 0;
    if ((r2 > .15 || l2 > .15) && $('art').querySelector('.rot')) { view3d.z = Math.max(.5, Math.min(2.6, view3d.z * (1 + (r2 - l2) * .03))); applyView(); }
    // analógico direito: gira a capa 3D (em qualquer tela onde ela aparece)
    const rx = p.axes[2] || 0, ry = p.axes[3] || 0;
    if ((Math.abs(rx) > .18 || Math.abs(ry) > .18) && $('art').querySelector('.rot')) {
      view3d.ry += rx * 4; view3d.rx = Math.max(-60, Math.min(60, view3d.rx - ry * 3)); applyView();
    }
  }
}
requestAnimationFrame(pollPad);
window.addEventListener('gamepadconnected', e => toast('🎮 Controle conectado: ' + (e.gamepad.id || '').replace(/\(.*\)/, '').trim()));
