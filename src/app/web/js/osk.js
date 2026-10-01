// PlayLoop — osk.js
/* ---------- teclado virtual (QWERTY) para digitar com o controle ---------- */
let oskOpen = false, oskTarget = null, oskSel = [1, 0], oskShift = false, lastInputPad = false;
const OSK_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0','-'],
  ['q','w','e','r','t','y','u','i','o','p','\''],
  ['a','s','d','f','g','h','j','k','l','ç',':'],
  ['⇧','z','x','c','v','b','n','m',',','.','/'],
  ['␣','⌫','✓'],
];
function oskRender() {
  $('osk').innerHTML = `<div class="oskval"></div>` + OSK_ROWS.map((r, y) => `<div class="oskrow">${r.map((k, x) => `<button class="oskk${k.length > 1 || k === '␣' || k === '⌫' || k === '✓' || k === '⇧' ? ' wide k' + ['␣','⌫','✓','⇧'].indexOf(k) : ''}${x === oskSel[1] && y === oskSel[0] ? ' sel' : ''}${k === '⇧' && oskShift ? ' on' : ''}" data-y="${y}" data-x="${x}">${k === '␣' ? 'espaço' : k === '⌫' ? '⌫ apagar' : k === '✓' ? '✓ OK' : oskShift && k.length === 1 ? k.toUpperCase() : k}</button>`).join('')}</div>`).join('');
  $('osk').querySelectorAll('.oskk').forEach(b => b.onmousedown = e => { e.preventDefault(); oskSel = [+b.dataset.y, +b.dataset.x]; oskPress(); });
  oskShow();
}
function oskShow() { const v = $('osk').querySelector('.oskval'); if (v && oskTarget) v.innerHTML = esc(oskTarget.value) + '<span class="caret"></span>'; }
function openOsk(el) {
  if (!el) return; oskTarget = el; oskOpen = true; oskSel = [1, 0]; oskShift = false;
  el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
  $('osk').classList.add('on'); oskRender(); sfx('ok');
}
function closeOsk(confirm) {
  if (!oskOpen) return; oskOpen = false; $('osk').classList.remove('on');
  const el = oskTarget; oskTarget = null;
  if (el && confirm && (el.id === 'cq' || el.classList.contains('rn'))) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));   // busca de imagem / renomear: mesmo efeito do Enter
  if (el && !confirm && el.classList.contains('rn')) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));   // desistiu de renomear: cancela
  if (el && document.activeElement === el) el.blur();   // tira o foco do texto p/ o controle voltar a navegar
  try { document.getElementById('view')?.focus?.(); } catch (e) {}
  sfx(confirm ? 'ok' : 'back');
}
function oskType(s) {
  const el = oskTarget; if (!el) return;
  if (s === null) el.value = el.value.slice(0, -1); else el.value += s;
  el.dispatchEvent(new Event('input', { bubbles: true })); oskShow();
}
function oskPress() {
  const k = OSK_ROWS[oskSel[0]][oskSel[1]];
  if (k === '⌫') oskType(null); else if (k === '␣') oskType(' '); else if (k === '✓') closeOsk(true);
  else if (k === '⇧') { oskShift = !oskShift; oskRender(); }
  else { oskType(oskShift ? k.toUpperCase() : k); if (oskShift) { oskShift = false; oskRender(); } }
  sfx('tick');
}
function oskInput(a) {
  const [y, x] = oskSel;
  if (a === 'up' || a === 'down') { const ny = Math.max(0, Math.min(OSK_ROWS.length - 1, y + (a === 'up' ? -1 : 1))); oskSel = [ny, Math.min(OSK_ROWS[ny].length - 1, Math.round(x * (OSK_ROWS[ny].length - 1) / Math.max(1, OSK_ROWS[y].length - 1)))]; oskRender(); sfx('tick'); }
  else if (a === 'left' || a === 'right') { const n = OSK_ROWS[y].length; oskSel = [y, (x + (a === 'left' ? -1 : 1) + n) % n]; oskRender(); sfx('tick'); }
  else if (a === 'ok') oskPress();
  else if (a === 'fav') oskType(null);          // □ / X = apagar
  else if (a === 'menu') oskType(' ');          // △ / Y = espaço
  else if (a === 'start') closeOsk(true);       // Start = confirmar
  else if (a === 'pgup' || a === 'pgdn') { oskShift = !oskShift; oskRender(); }
  else if (a === 'back') closeOsk(false);
}
// teclado/mouse físico: marca que a última ação não foi pelo controle
document.addEventListener('keydown', () => { lastInputPad = false; }, true);
document.addEventListener('mousedown', e => { if (!e.target.closest('#osk')) lastInputPad = false; }, true);
