// PlayLoop — config.js
/* ---------- SteamGridDB: ajuda + links (abrem no navegador) ---------- */
const SGDB_HELP = `<div class="sghelp">O <b>SteamGridDB</b> é um site gratuito, feito pela comunidade, com milhares de capas, fundos e logos de jogos em alta qualidade. Para o PlayLoop buscar essas imagens, você precisa de uma <b>chave da API</b> (gratuita):
  <ol><li>Entre no site com a sua conta Steam: <a data-href="https://www.steamgriddb.com/login">steamgriddb.com/login</a></li>
  <li>Abra <a data-href="https://www.steamgriddb.com/profile/preferences/api">Preferências → API</a> e clique em <b>Generate API Key</b>.</li>
  <li>Copie a chave e cole no campo abaixo.</li></ol></div>`;
function bindLinks(root) { root.querySelectorAll('a[data-href]').forEach(a => a.onclick = e => { e.preventDefault(); api('/api/open', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: a.dataset.href }) }).catch(() => {}); }); }

/* ---------- tela de configuração ---------- */
let cfg = null;
async function openConfig() {
  show('config'); history.replaceState(null, '', '/config');
  $('cfBody').innerHTML = '<div class="empty">Carregando...</div>';
  try { cfg = await api('/api/config'); cfgSaved = cfgJson(); } catch (e) { $('cfBody').innerHTML = `<div class="empty">Erro: ${esc(e.message)}</div>`; return; }
  renderConfig();
}
function fieldHtml(i, key, label, val, browse, multi) {
  const inp = multi ? `<textarea data-i="${i}" data-k="${key}" rows="2">${esc(val)}</textarea>` : `<input data-i="${i}" data-k="${key}" value="${esc(val)}">`;
  return `<div class="fld"><label>${label}</label><div class="line">${inp}${browse ? `<button class="btn sec sm" data-browse="${browse}" data-i="${i}" data-k="${key}">Procurar...</button>` : ''}${key === 'emulator' ? `<span class="st" id="st${i}"></span>` : ''}</div></div>`;
}
const CF_SECS = [['geral', 'Geral'], ['consoles', 'Consoles'], ['capas', 'Capas e vídeo'], ['favoritos', 'Favoritos']];
let cfSec = 'geral';
// opções com desenho ilustrativo (o rádio fica escondido; o cartão inteiro é clicável)
const pick = (name, val, on, svg, title, sub) => `<label class="pick"><input type="radio" name="${name}" value="${val}" ${on ? 'checked' : ''}><div class="pv">${svg}</div><b>${title}</b><small>${sub || ''}</small></label>`;
const PV = {
  c3d: `<svg viewBox="0 0 120 90"><defs><linearGradient id="pf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#00D1FF"/></linearGradient></defs><path d="M38 14 L52 8 L52 82 L38 76 Z" fill="#0b0b0b"/><path d="M52 8 L96 16 L96 76 L52 82 Z" fill="url(#pf)" stroke="#0b0b0b" stroke-width="2"/><path d="M58 20 L90 25 M58 30 L84 34" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/><path d="M45 20 L45 70" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg>`,
  c2d: `<svg viewBox="0 0 120 90"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#00D1FF"/></linearGradient></defs><rect x="26" y="10" width="72" height="70" rx="5" fill="#0b0b0b"/><rect x="31" y="15" width="11" height="60" fill="#1d1d1d"/><path d="M36.5 22 L36.5 68" stroke="#fff" stroke-opacity=".4" stroke-width="2"/><rect x="43" y="15" width="50" height="60" fill="url(#pg)"/><path d="M49 26 H86 M49 35 H78" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></svg>`,
  video: `<svg viewBox="0 0 120 90"><rect x="14" y="14" width="92" height="62" rx="6" fill="#1e293b" stroke="#3B82F6" stroke-width="2"/><circle cx="60" cy="45" r="15" fill="#ff2d2d"/><path d="M55 37 L68 45 L55 53 Z" fill="#fff"/><rect x="22" y="66" width="76" height="3" rx="1.5" fill="#475569"/><rect x="22" y="66" width="30" height="3" rx="1.5" fill="#00D1FF"/></svg>`,
  image: `<svg viewBox="0 0 120 90"><rect x="14" y="14" width="92" height="62" rx="6" fill="#1e293b" stroke="#3B82F6" stroke-width="2"/><circle cx="84" cy="30" r="7" fill="#fbbf24"/><path d="M18 72 L46 40 L64 58 L76 48 L102 72 Z" fill="#8B5CF6"/></svg>`,
};
function themePv(bg, surf, acc, txt) {
  return `<svg viewBox="0 0 120 90"><rect x="8" y="8" width="104" height="74" rx="8" fill="${bg}" stroke="#475569" stroke-width="1"/><rect x="8" y="8" width="104" height="14" rx="8" fill="${surf}"/><rect x="16" y="30" width="40" height="8" rx="3" fill="${acc}"/><rect x="16" y="44" width="40" height="5" rx="2.5" fill="${txt}" opacity=".7"/><rect x="16" y="54" width="32" height="5" rx="2.5" fill="${txt}" opacity=".45"/><rect x="66" y="30" width="38" height="44" rx="5" fill="${surf}" stroke="${acc}" stroke-width="1.5"/></svg>`;
}
function gridPv(d) {
  const [R, C] = d.split('x').map(Number), W = 112, H = 78, g = 2.5, cw = (W - g * (C - 1)) / C, ch = (H - g * (R - 1)) / R;
  let s = '';
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) s += `<rect x="${(4 + x * (cw + g)).toFixed(1)}" y="${(6 + y * (ch + g)).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" rx="1.6" fill="${x < 2 && y < 2 ? '#00D1FF' : '#334155'}"/>`;
  return `<svg viewBox="0 0 120 90">${s}</svg>`;
}
function renderConfig() {
  const cs = cfg.consoles;
  const sec = (id, title, html) => `<div class="cfsec${cfSec === id ? ' on' : ''}" data-sec="${id}"><h2>${title}</h2>${html}</div>`;
  $('cfBody').innerHTML = `<nav class="cfnav">${CF_SECS.map(([id, t]) => `<button class="${cfSec === id ? 'on' : ''}" data-nav="${id}">${t}</button>`).join('')}</nav><div class="cfmain" id="cfMain">` +
    sec('geral', '🚀 Geral', `<div class="cfcache"><h3>🎨 Tema</h3><div class="picks">${pick('thm', 'blue', !cfg.theme || cfg.theme === 'blue', themePv('#0B1020', '#1E293B', '#00D1FF', '#E5E7EB'), 'Azul', 'padrão')}${pick('thm', 'oled', cfg.theme === 'oled', themePv('#000', '#0d0d0d', '#00D1FF', '#E5E7EB'), 'Preto', 'ideal para telas OLED')}${pick('thm', 'light', cfg.theme === 'light', themePv('#F1F5F9', '#fff', '#2563EB', '#0f172a'), 'Branco', 'claro')}</div></div><div class="cfgen">
      ${fieldHtml(-1, 'root', 'Pasta dos emuladores e jogos', cfg.root || '', 'folder')}
    </div>
    <div class="cfcache">
      <h3>🚀 Inicialização</h3>
      <div class="line"><button class="btn sec sm" id="cfRedo">Refazer configuração inicial (detectar consoles de novo)</button></div>
      <label class="chk2"><input type="checkbox" id="cfAuto" ${cfg.autostart === false ? '' : 'checked'}> Abrir na inicialização do Windows (em segundo plano, perto do relógio)</label>
    </div>
    `) +
    sec('consoles', '🎮 Consoles e emuladores', `<div class="cfgrid">
      ${cs.map((c, i) => `
      <div class="ccard${c.enabled === false ? ' off' : ''}">
        <div class="top"><button class="icobtn" data-ico="${i}" title="Trocar ícone"><img src="${logoUrl(c)}" alt="" onerror="this.style.opacity=.2"><span>trocar ícone</span></button><button class="icobtn bgb" data-bgp="${i}" title="Trocar fundo do console" style="background-image:url('${bgUrlOf(c)}')"><span>trocar fundo</span></button><input data-i="${i}" data-k="name" value="${esc(c.name)}"><label class="chk2 en"><input type="checkbox" data-en="${i}" ${c.enabled === false ? '' : 'checked'}> Habilitar</label></div>
        <div class="icopick" id="ip${i}" style="display:none"></div>
        ${c.type === 'pc' ? `<div class="msg">🖥 Jogos de PC — escolha uma ou mais pastas com atalhos (.lnk / .url / .exe) dos jogos instalados. Eles abrem direto, sem emulador.</div>` : fieldHtml(i, 'emulator', 'Emulador (.exe)', c.emulator || '', 'file') + fieldHtml(i, 'args', 'Argumentos — {rom} é trocado pelo caminho do jogo', c.args || '"{rom}"') + `<div class="fld"><label class="chk2"><input type="checkbox" data-fs="${i}" ${c.fullscreen === false ? '' : 'checked'}> Abrir os jogos em tela cheia</label></div>` + fieldHtml(i, 'fsArgs', 'Argumento de tela cheia deste emulador (vai antes dos argumentos)', c.fsArgs == null ? '' : c.fsArgs)}
        ${fieldHtml(i, 'romDirs', c.type === 'pc' ? 'Pastas com atalhos dos jogos (uma por linha)' : 'Pastas de jogos (uma por linha)', (c.romDirs || []).join('\n'), 'folder-add', true)}
        ${fieldHtml(i, 'extensions', 'Extensões dos jogos (separadas por vírgula)', (c.extensions || []).join(', '))}
      </div>`).join('')}
    </div>
    <div style="margin-top:18px"><button class="btn sec" id="cfAdd">+ Adicionar console</button> <button class="btn sec" id="cfAddPc">+ Adicionar jogos de PC</button></div>`) +
    sec('capas', '🖼 Capas e vídeo', `<div class="cfcache">
      <h3>🎬 Fundo dos jogos</h3>
      <div class="picks">${pick('bgm', 'video', cfg.bgMode !== 'image', PV.video, 'Vídeo', 'gameplay do YouTube')}${pick('bgm', 'image', cfg.bgMode === 'image', PV.image, 'Imagem', 'tela ou arte do jogo')}</div>
    </div>
    <div class="cfcache">
      <h3>📦 Estilo das capas</h3>
      <div class="picks">${pick('cst', '3d', cfg.coverStyle !== '2d', PV.c3d, '3D', 'caixa girando')}${pick('cst', '2d', cfg.coverStyle === '2d', PV.c2d, '2D', 'encarte aberto, mais leve')}</div>
    </div>
    <div class="cfcache">
      <h3>💾 Cache</h3>
      <label class="chk2"><input type="checkbox" id="cfCacheOn" ${cfg.coverCache === false ? '' : 'checked'}> Salvar capas no computador (carregam na hora nas próximas vezes)</label>
      <div class="line"><button class="btn sec sm" id="cfCacheClear">Limpar cache de capas</button><span class="msg" id="cfCacheInfo"></span></div>
    </div>
    <div class="cfcache">
      <h3>🎨 SteamGridDB (opcional)</h3>
      ${SGDB_HELP}
      <div class="line"><input id="cfSgKey" placeholder="Cole aqui a sua chave da API" value="${esc(cfg.sgdbKey || '')}" style="flex:1;background:#101010;border:1px solid #333;color:#eee;border-radius:6px;padding:8px 10px"><button class="btn sec sm" id="cfSgTest">Testar chave</button></div>
      <label class="chk2"><input type="checkbox" id="cfSgOn" ${cfg.useSgdb && cfg.sgdbKey ? 'checked' : ''}> Usar o SteamGridDB para capas, fundos e logos</label>
    </div>`) +
    sec('favoritos', '⭐ Favoritos', `<div class="cfcache"><h3>Grade dos favoritos</h3>
        <div class="picks">${['4x10', '4x12', '6x12'].map(d => pick('fgd', d, (cfg.favGrid || '4x12') === d, gridPv(d), d.replace('x', ' × '), d === '4x12' ? 'padrão' : (d === '6x12' ? 'mais jogos por página' : 'cards maiores'))).join('')}</div>
        <h3 style="margin-top:16px">Fundo da tela</h3>
        <div class="picks">${pick('fbg', '0', !cfg.favBgGame, PV.image, 'Fundo fixo', 'o fundo do console Favoritos')}${pick('fbg', '1', !!cfg.favBgGame, PV.video.replace('#ff2d2d', '#8B5CF6'), 'Fundo do jogo', 'muda ao selecionar um card')}</div>
        <div class="msg">Cada jogo favorito vira um card. Arraste um card para mudar de lugar (até para outra página), arraste a borda direita/de baixo para aumentar (até 4 × 4) ou use o botão direito → Redimensionar.</div></div><div class="cfgrid"><div class="ccard${favCfg().enabled ? '' : ' off'}">
        <div class="top"><button class="icobtn" data-ico="-2" title="Trocar ícone"><img src="${logoUrl(Object.assign({}, FAVSYS, { logo: favCfg().logo || 'builtin:fav' }))}" alt=""><span>trocar ícone</span></button><button class="icobtn bgb" data-bgp="-2" title="Trocar fundo" style="background-image:url('${favCfg().bg ? bgUrlOf({ bg: favCfg().bg }) : FAV_BG}')"><span>trocar fundo</span></button><input value="⭐ Favoritos" disabled><label class="chk2 en"><input type="checkbox" data-en="-2" ${favCfg().enabled ? 'checked' : ''}> Habilitar</label></div>
        <div class="icopick" id="ip-2" style="display:none"></div>
        <div class="msg">Grade com todos os jogos que você marcou com ⭐. Arraste na tela inicial para mudar a posição deste console.</div>
      </div></div>`) + '</div>';
  $('cfBody').querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { cfSec = b.dataset.nav; $('cfBody').querySelectorAll('[data-nav]').forEach(x => x.classList.toggle('on', x === b)); $('cfBody').querySelectorAll('.cfsec').forEach(s => s.classList.toggle('on', s.dataset.sec === cfSec)); $('cfMain').scrollTop = 0; sfx('tick'); });
  $('cfBody').querySelectorAll('input[name=thm]').forEach(r => r.onchange = () => { cfg.theme = r.value; applyTheme(r.value); });
  $('cfBody').querySelectorAll('input[name=fbg]').forEach(r => r.onchange = () => { cfg.favBgGame = r.value === '1'; favBgGame = cfg.favBgGame; });
  $('cfBody').querySelectorAll('input[name=fgd]').forEach(r => r.onchange = () => { cfg.favGrid = r.value; favGridDim = r.value; });
  $('cfBody').querySelectorAll('[data-k]').forEach(el => el.oninput = () => setField(+el.dataset.i, el.dataset.k, el.value));
  $('cfBody').querySelectorAll('[data-browse]').forEach(el => el.onclick = () => browse(el));
  $('cfBody').querySelectorAll('[data-en]').forEach(el => el.onchange = () => {
    const i = +el.dataset.en;
    if (i === -2) favCfg().enabled = el.checked; else cfg.consoles[i].enabled = el.checked;
    el.closest('.ccard').classList.toggle('off', !el.checked);
  });
  $('cfBody').querySelectorAll('[data-del]').forEach(el => el.onclick = () => { if (confirmDel(+el.dataset.del)) { cfg.consoles.splice(+el.dataset.del, 1); renderConfig(); } });
  $('cfRedo').onclick = () => { if (confirm('Refazer a configuração inicial? Os consoles serão detectados de novo (capas, favoritos e ocultos são mantidos).')) location.href = '/welcome'; };
  $('cfBody').querySelectorAll('input[name=bgm]').forEach(r => r.onchange = () => { cfg.bgMode = r.value; });
  $('cfBody').querySelectorAll('input[name=cst]').forEach(r => r.onchange = () => { cfg.coverStyle = r.value; coverStyle2d = r.value === '2d'; });
  $('cfAuto').onchange = () => { cfg.autostart = $('cfAuto').checked; };
  $('cfSgKey').oninput = () => { cfg.sgdbKey = $('cfSgKey').value.trim(); if (!cfg.sgdbKey) { cfg.useSgdb = false; $('cfSgOn').checked = false; } };
  $('cfSgOn').onchange = () => { if ($('cfSgOn').checked && !cfg.sgdbKey) { $('cfSgOn').checked = false; toast('Cole a chave da API primeiro', true); return; } cfg.useSgdb = $('cfSgOn').checked; };
  $('cfSgTest').onclick = async () => { await saveCfg(); try { await api('/api/sgdb?p=' + encodeURIComponent('/api/v2/search/autocomplete/mario')); toast('Chave válida! ✓'); } catch (e) { toast('Chave inválida ou sem internet: ' + e.message, true); } };
  bindLinks($('cfBody'));
  $('cfBody').querySelectorAll('[data-fs]').forEach(el => el.onchange = () => { cfg.consoles[+el.dataset.fs].fullscreen = el.checked; });
  cfg.consoles.forEach(async (c, i) => { if (c.fsArgs == null && c.emulator && c.type !== 'pc') { try { const r = await api('/api/fsarg?emu=' + encodeURIComponent(c.emulator)); c.fsArgs = r.arg; const el = $('cfBody').querySelector(`[data-i="${i}"][data-k="fsArgs"]`); if (el) el.value = r.arg; } catch (e) {} } });
  $('cfCacheOn').onchange = () => { cfg.coverCache = $('cfCacheOn').checked; };
  $('cfCacheClear').onclick = async () => { try { await api('/api/cache/clear', { method:'POST' }); artDisk = {}; for (const k in artCache) delete artCache[k]; toast('Cache de capas limpo'); cacheInfo(); } catch (e) { toast(e.message, true); } };
  cacheInfo();
  $('cfBody').querySelectorAll('[data-ico]').forEach(el => el.onclick = () => iconPicker(+el.dataset.ico, 'logo'));
  $('cfBody').querySelectorAll('[data-bgp]').forEach(el => el.onclick = () => iconPicker(+el.dataset.bgp, 'bg'));
  $('cfAddPc').onclick = () => { cfg.consoles.push({ id: 'pc' + Date.now(), type: 'pc', name: 'Jogos de PC', art: 'pc', thumbs: '', emulator: '', args: '', romDirs: [], extensions: ['lnk', 'url', 'exe'] }); renderConfig(); $('cfMain').scrollTop = 1e9; };
  $('cfAdd').onclick = () => { cfg.consoles.push({ id: 'c' + Date.now(), name: 'Novo console', art: '', thumbs: '', emulator: '', args: '"{rom}"', romDirs: [], extensions: [] }); renderConfig(); $('cfMain').scrollTop = 1e9; };
  cs.forEach((c, i) => checkEmu(i));
}
const ICON_ART = ['pc','windows','steam','snes','nes','n64','gc','wii','wiiu','switch','gb','gbc','gba','nds','3ds','mastersystem','megadrive','genesis','segacd','32x','saturn','dreamcast','neogeo','arcade','mame','psx','ps2','ps3','ps4','psp','psvita','xbox','xbox360','atari2600','pcengine'];
function iconPicker(i, kind) {
  const box = $('ip' + i), c = i === -2 ? favCfg() : cfg.consoles[i], isBg = kind === 'bg', field = isBg ? 'bg' : 'logo';
  if (box.style.display !== 'none' && box.dataset.kind === kind) { box.style.display = 'none'; return; }
  box.dataset.kind = kind;
  const opts = isBg ? ICON_ART.map(a => ['art:' + a, `${ART}background/${a}.jpg`, a])
    : [['builtin:pc', BUILTIN_LOGOS.pc, 'Moderno'], ['builtin:pc2', BUILTIN_LOGOS.pc2, 'Neon']].concat(ICON_ART.map(a => ['art:' + a, `${ART}logos/${a}.svg`, a]));
  box.style.display = 'block';
  box.innerHTML = `<div class="pkt">${isBg ? 'Imagem de fundo do console' : 'Ícone do console'}</div><div class="icogrid${isBg ? ' bgs' : ''}">${opts.map(o => `<div class="ico${(c[field] || '') === o[0] ? ' sel' : ''}" data-v="${esc(o[0])}"><img src="${esc(o[1])}" alt="" loading="lazy" onerror="this.parentNode.remove()"><span>${esc(o[2])}</span></div>`).join('')}</div>
    <div class="line" style="margin-top:8px"><input placeholder="...ou cole o link de uma imagem" id="ipu${i}"><button class="btn sec sm" id="ipok${i}">Usar link</button><button class="btn sec sm" id="ipfile${i}">📁 Arquivo do computador...</button><button class="btn sec sm" id="ipdef${i}">Padrão</button></div>`;
  const set = v => { c[field] = v; const y = $('cfMain').scrollTop; renderConfig(); $('cfMain').scrollTop = y; };
  box.querySelectorAll('.ico').forEach(el => el.onclick = () => set(el.dataset.v));
  $('ipok' + i).onclick = () => { const u = $('ipu' + i).value.trim(); if (/^https?:\/\//.test(u)) set(u); };
  $('ipfile' + i).onclick = async () => {
    try { const r = await api('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: 'image', start: '' }) }); if (r.path) set('/api/localimg?p=' + encodeURIComponent(r.path)); }
    catch (e) { toast(e.message, true); }
  };
  $('ipdef' + i).onclick = () => set('');
}
async function cacheInfo() { try { const r = await api('/api/cache/info'); $('cfCacheInfo').textContent = `${r.files} arquivos · ${(r.size / 1048576).toFixed(1)} MB`; } catch (e) {} }
// configurações do console "Favoritos" (cfg.fav = { enabled, logo, bg })
function favCfg() { if (!cfg.fav) cfg.fav = { enabled: cfg.favConsole !== false }; if (cfg.fav.enabled == null) cfg.fav.enabled = true; return cfg.fav; }
function confirmDel(i) { return window.confirm(`Remover "${cfg.consoles[i].name}" do PlayLoop? (os arquivos não são apagados)`); }
function setField(i, k, v) {
  if (i < 0) { cfg[k] = k === 'port' ? (parseInt(v) || 8765) : v; return; }
  const c = cfg.consoles[i];
  if (k === 'romDirs') c.romDirs = v.split('\n').map(x => x.trim()).filter(Boolean);
  else if (k === 'extensions') c.extensions = v.split(/[,\s;]+/).map(x => x.trim().replace(/^\./, '').toLowerCase()).filter(Boolean);
  else c[k] = v;
  if (k === 'emulator') { clearTimeout(c._t); c._t = setTimeout(() => checkEmu(i), 300); }
}
async function checkEmu(i) {
  const c = cfg.consoles[i], el = $('st' + i); if (!el) return;
  if (!c.emulator) { el.className = 'st no'; el.textContent = 'sem emulador'; return; }
  try { const r = await api('/api/exists?p=' + encodeURIComponent(c.emulator)); el.className = 'st ' + (r.file ? 'ok' : 'no'); el.textContent = r.file ? '✓ encontrado' : '✗ não encontrado'; } catch (e) {}
}
async function browse(btn) {
  const i = +btn.dataset.i, k = btn.dataset.k, type = btn.dataset.browse;
  const cur = i < 0 ? cfg[k] : (k === 'romDirs' ? (cfg.consoles[i].romDirs[0] || '') : cfg.consoles[i][k]);
  btn.disabled = true;
  try {
    const r = await api('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: type === 'file' ? 'file' : 'folder', start: cur || '' }) });
    if (r.path) {
      if (type === 'folder-add') { const c = cfg.consoles[i]; if (!c.romDirs.includes(r.path)) c.romDirs.push(r.path); }
      else if (i < 0) cfg[k] = r.path; else cfg.consoles[i][k] = r.path;
      const y = $('cfMain').scrollTop; renderConfig(); $('cfMain').scrollTop = y;
    }
  } catch (e) { toast(e.message, true); }
  btn.disabled = false;
}
// configuração salva sozinha: a cada alteração (com um pequeno atraso) e ao sair da tela
let cfgSaved = '';
const cfgJson = () => JSON.stringify(cfg, (k, v) => k === '_t' ? undefined : v, 2);
async function saveCfg() {
  if (!cfg) return; const j = cfgJson(); if (j === cfgSaved) return;
  try { await api('/api/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: j }); cfgSaved = j; $('cfSaved').textContent = '✓ salvo'; setTimeout(() => $('cfSaved').textContent = '', 1500); }
  catch (e) { toast('Erro ao salvar: ' + e.message, true); }
}
setInterval(() => { if (screen === 'config') saveCfg(); }, 1500);
$('cfCancel').onclick = async () => { await saveCfg(); location.href = '/'; };
$('gear').onclick = openConfig;
