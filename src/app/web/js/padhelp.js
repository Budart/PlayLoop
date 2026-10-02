// PlayLoop — padhelp.js
/* ---------- legenda de comandos do controle (rodapé), com os símbolos do controle conectado ---------- */
let padType = null, padKey = '';
function detectPad(id) {
  id = (id || '').toLowerCase();
  if (/xbox|xinput|045e/.test(id)) return 'xbox';
  if (/playstation|dualsense|dualshock|054c|wireless controller/.test(id)) return 'ps';
  if (/nintendo|pro controller|joy-?con|057e|switch/.test(id)) return 'nin';
  return 'gen';
}
// botões pela posição no controle: 0 = baixo, 1 = direita, 2 = esquerda, 3 = cima (mapeamento padrão)
const FACE = {
  xbox: [['A', '#16a34a'], ['B', '#dc2626'], ['X', '#2563eb'], ['Y', '#ca8a04']],
  ps:   [['✕', '#60a5fa'], ['○', '#f87171'], ['□', '#f472b6'], ['△', '#34d399']],
  nin:  [['B', '#64748b'], ['A', '#64748b'], ['Y', '#64748b'], ['X', '#64748b']],
};
const SHOULDER = { xbox: ['LB', 'RB', 'LT', 'RT', 'View', 'Menu'], ps: ['L1', 'R1', 'L2', 'R2', 'Share', 'Options'], nin: ['L', 'R', 'ZL', 'ZR', '−', '+'], gen: ['L1', 'R1', 'L2', 'R2', 'Select', 'Start'] };
function faceIcon(i) {
  if (padType === 'gen') {   // genérico: losango com a posição do botão destacada
    const pos = [[12, 19], [19, 12], [5, 12], [12, 5]];
    return `<svg class="pg" viewBox="0 0 24 24">${pos.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${k === i ? '#fff' : 'none'}" stroke="#fff" stroke-opacity="${k === i ? 1 : .45}" stroke-width="1.4"/>`).join('')}</svg>`;
  }
  const [t, c] = FACE[padType][i];
  const sym = padType === 'ps'
    ? [`<path d="M8 8l8 8M16 8l-8 8"/>`, `<circle cx="12" cy="12" r="4.6"/>`, `<rect x="7.6" y="7.6" width="8.8" height="8.8" rx=".6"/>`, `<path d="M12 7l5 8.6H7z"/>`][i]
    : `<text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="700" fill="${c}" stroke="none" font-family="Poppins,Segoe UI,sans-serif">${t}</text>`;
  return `<svg class="pg pf" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1e293b" stroke="${c}" stroke-opacity=".55" stroke-width="1"/><g fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${sym}</g></svg>`;
}
const DPAD = '<svg class="pg" viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const STICK = s => `<span class="pb st">${s}</span>`;
const SH = i => `<span class="pb sh">${SHOULDER[padType][i]}</span>`;
const G = { l3: () => STICK('L'), ok: () => faceIcon(0), back: () => faceIcon(1), sq: () => faceIcon(2), tri: () => faceIcon(3), dpad: () => DPAD, lb: () => SH(0) + SH(1), lt: () => SH(2) + SH(3), sel: () => SH(4), start: () => SH(5), rs: () => STICK('R') };
// comandos de cada tela/situação
function padContext() {
  if (oskOpen) return ['osk', [['dpad', 'escolher tecla'], ['ok', 'digitar'], ['sq', 'apagar'], ['tri', 'espaço'], ['lb', 'maiúsculas'], ['start', 'OK'], ['back', 'fechar']]];
  const ctxOn = $('ctx').classList.contains('on');
  if (ARTPICK.open) return ['artpick', [['dpad', 'escolher'], ['ok', 'usar'], ['tri', 'buscar'], ['back', 'fechar']]];
  if (askOpen) return ['ask', [['dpad', 'escolher'], ['ok', 'confirmar'], ['back', 'cancelar']]];
  if (ctxOn) return ['ctx', [['dpad', 'escolher'], ['ok', 'selecionar'], ['back', 'fechar']]];
  if (typeof fxOpen !== 'undefined' && fxOpen) return ['fx', [['back', 'cancelar']]];
  if (typeof fp !== 'undefined' && fp.open) return ['fp', [['dpad', 'mover imagem'], ['lb', 'zoom'], ['ok', 'salvar'], ['back', 'cancelar']]];
  if (modalOpen) return ['cover', [['dpad', 'escolher imagem'], ['ok', 'usar'], ['tri', 'digitar busca'], ['back', 'fechar']]];
  if (typeof fgInfoOpen !== 'undefined' && fgInfoOpen) return ['info', [['ok', 'jogar'], ['rs', 'girar capa'], ['lt', 'zoom'], ['back', 'fechar']]];
  if (screen === 'config') { const c = document.querySelector('#cfBody .kbf'); if (typeof cfgIn !== 'undefined' && cfgIn) return ['configin', [['dpad', 'campos do card'], ['ok', 'selecionar'], ['back', 'sair do card'], ['start', 'sair']]]; if (c && c.classList.contains('ccard')) return ['configcard', [['dpad', 'navegar'], ['ok', 'editar card'], ['back', 'voltar'], ['start', 'sair']]]; return ['config', [['dpad', 'navegar'], ['ok', 'selecionar'], ['back', 'voltar'], ['start', 'sair']]]; }
  if (screen === 'favgrid') {
    if (fg.moving) return ['fgmove', [['dpad', 'mover card'], ['sq', 'soltar'], ['back', 'cancelar']]];
    return ['favgrid', [['dpad', 'navegar'], ['ok', 'jogar'], ['sq', 'mover card'], ['tri', 'menu'], ['lb', 'página'], ['back', 'voltar']]];
  }
  if (screen === 'games') return ['games', [['dpad', 'navegar'], ['ok', 'jogar'], ['sq', 'favoritar'], ['tri', 'menu'], ['lb', 'pular'], ['rs', 'girar capa'], ['lt', 'zoom'], ['l3', 'buscar'], ['back', 'voltar']]];
  if (screen === 'systems' && typeof sysMoving !== 'undefined' && sysMoving) return ['sysmove', [['dpad', 'mover console'], ['sq', 'soltar'], ['back', 'cancelar']]];
  if (screen === 'systems' && typeof topSel !== 'undefined' && topSel >= 0) return ['top', [['dpad', 'escolher'], ['ok', 'abrir'], ['back', 'voltar']]];
  if (screen === 'systems') return ['systems', [['dpad', 'console / ↑ topo'], ['ok', 'entrar'], ['sq', 'mover'], ['start', 'configuração'], ['l3', 'buscar'], ['sel', 'modo TV']]];
  return ['', []];
}
// mesma legenda para quem está no teclado: troca na hora conforme a última entrada (teclado ↔ controle)
let legendMode = 'pad';
document.addEventListener('keydown', () => { legendMode = 'kb'; }, true);
const KB = {
  sysmove: [['← →', 'mover console'], ['Espaço', 'soltar'], ['Esc', 'cancelar']],
  top: [['← →', 'escolher'], ['Enter', 'abrir'], ['↓ Esc', 'voltar']],
  systems: [['← →', 'escolher console'], ['↑', 'topo'], ['Enter', 'entrar'], ['A-Z', 'buscar'], ['F1', 'configuração']],
  games: [['↑ ↓', 'navegar'], ['Enter', 'jogar'], ['PgUp PgDn', 'pular'], ['F2', 'renomear'], ['A-Z', 'buscar'], ['Esc', 'voltar']],
  favgrid: [['Setas', 'navegar'], ['Enter', 'jogar'], ['Espaço', 'mover'], ['I', 'info'], ['Esc', 'voltar'], ['Alt+arrastar', 'imagem do card'], ['Ctrl+redimensionar', 'proporção'], ['Arrastar no vazio', 'selecionar vários']],
  fgmove: [['Setas', 'mover card'], ['Espaço', 'soltar'], ['Esc', 'cancelar']],
  config: [['Clique', 'escolher'], ['F1', 'configuração'], ['Esc', 'voltar']],
  configcard: [['↑ ↓', 'cards'], ['Enter', 'editar card'], ['Esc', 'voltar']],
  configin: [['Tab', 'campos'], ['Clique', 'editar'], ['Esc', 'voltar']],
  ask: [['← →', 'escolher'], ['Enter', 'confirmar'], ['Esc', 'cancelar']],
  ctx: [['↑ ↓', 'escolher'], ['Enter', 'selecionar'], ['Esc', 'fechar']],
  cover: [['Setas', 'escolher imagem'], ['Enter', 'usar'], ['Esc', 'fechar']],
  artpick: [['Setas', 'escolher'], ['Enter', 'usar'], ['Esc', 'fechar']],
  fp: [['Setas', 'mover imagem'], ['PgUp PgDn', 'zoom'], ['Enter', 'salvar'], ['Esc', 'cancelar']],
  info: [['Enter', 'jogar'], ['Esc', 'fechar']],
  osk: [['Teclado', 'digitar'], ['Enter', 'fechar'], ['Esc', 'cancelar']],
  fx: [['Esc', 'cancelar']],
};
function updatePadHelp(pad) {
  const t = pad ? detectPad(pad.id) : null;
  document.body.classList.add('pad');   // legenda sempre visível; sem controle, mostra os atalhos do teclado
  padType = t || 'gen';
  const mode = t ? legendMode : 'kb';
  const [k, items] = padContext(), key = mode + '|' + padType + '|' + k;
  if (key === padKey) return;
  padKey = key;
  $('padHelp').classList.toggle('kb', mode === 'kb');
  $('padHelp').innerHTML = mode === 'kb'
    ? (KB[k] || []).map(([kk, txt]) => `<span class="pi"><b class="kk">${kk}</b><em>${txt}</em></span>`).join('')
    : items.map(([g, txt]) => `<span class="pi">${G[g]()}<em>${txt}</em></span>`).join('');
}
