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
  return `<span class="pb" style="background:${c}">${t}</span>`;
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
  if (screen === 'config') return ['config', [['dpad', 'navegar'], ['ok', 'selecionar'], ['back', 'voltar'], ['start', 'sair']]];
  if (screen === 'favgrid') {
    if (fg.moving) return ['fgmove', [['dpad', 'mover card'], ['sq', 'soltar'], ['back', 'cancelar']]];
    return ['favgrid', [['dpad', 'navegar'], ['ok', 'jogar'], ['sq', 'mover card'], ['tri', 'menu'], ['lb', 'página'], ['back', 'voltar']]];
  }
  if (screen === 'games') return ['games', [['dpad', 'navegar'], ['ok', 'jogar'], ['sq', 'favoritar'], ['tri', 'menu'], ['lb', 'pular'], ['rs', 'girar capa'], ['lt', 'zoom'], ['l3', 'buscar'], ['back', 'voltar']]];
  if (screen === 'systems') return ['systems', [['dpad', 'escolher console'], ['ok', 'entrar'], ['start', 'configuração'], ['l3', 'buscar'], ['sel', 'modo TV']]];
  return ['', []];
}
function updatePadHelp(pad) {
  const t = pad ? detectPad(pad.id) : null;
  document.body.classList.toggle('pad', !!t);
  if (!t) { padKey = ''; return; }
  padType = t;
  const [k, items] = padContext(), key = t + '|' + k;
  if (key === padKey) return;
  padKey = key;
  $('padHelp').innerHTML = items.map(([g, txt]) => `<span class="pi">${G[g]()}<em>${txt}</em></span>`).join('');
}
