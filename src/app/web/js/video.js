// PlayLoop — video.js
// ---- fundo em vídeo: gameplay do YouTube, começando em 1/4 da duração; leve: só 1 vídeo por vez, só depois de parar no jogo ----
const SMALL = matchMedia('(max-width: 1050px), (max-height: 620px)');
let bgKind = 'video', vidTimer = null, vidFor = null;
function rerenderCase() { if (lastArt && lastArt.g && screen === 'games') { if (!lastArt.done) { $('art').innerHTML = skeletonCase(lastArt.g); return; } $('art').innerHTML = buildCase(lastArt.g, lastArt.url, false, lastArt.ratio); if (lastArt.logo) { const sp = $('art').querySelector('.spine'); if (sp) sp.innerHTML = `<img class="spl" src="${esc(lastArt.logo)}" alt="">`; } } }
// capa desliza suavemente para o canto (FLIP: mede antes/depois e anima a diferença)
function setVidPlay(on) {
  const r = document.querySelector('.right'); if (!r || r.classList.contains('vidplay') === on) return;
  const el0 = $('art').firstElementChild, a0 = el0 && el0.getBoundingClientRect();
  r.classList.toggle('vidplay', on); rerenderCase();
  const el = $('art').firstElementChild; if (!a0 || !el || !a0.width) return;
  const a1 = el.getBoundingClientRect(); if (!a1.width) return;
  const s = a0.width / a1.width;
  el.style.transformOrigin = '0 0'; el.style.transition = 'none';
  el.style.transform = `translate(${a0.left - a1.left}px, ${a0.top - a1.top}px) scale(${s})`;
  el.getBoundingClientRect();
  el.style.transition = 'transform .7s cubic-bezier(.22,.8,.24,1)'; el.style.transform = '';
  setTimeout(() => { el.style.transition = ''; el.style.transformOrigin = ''; }, 750);
}
function stopVideo() { $('vidBox').classList.remove('loading'); clearTimeout(vidTimer); vidFor = null; setVidPlay(false); document.querySelectorAll('#vidBox .vid').forEach(v => { v.classList.remove('on'); setTimeout(() => v.remove(), 600); }); }
function vqReveal(f) { if (!f.isConnected || f.classList.contains('on') || !vidFor) return; diag('exibido'); f.classList.add('on'); setVidPlay(true); $('vidBox').classList.remove('loading'); }
// comandos para o player do YouTube (sem carregar a biblioteca deles)
const ytCmd = (f, func, args) => { try { f.contentWindow.postMessage(JSON.stringify({ event:'command', func, args: args || [] }), '*'); } catch (e) {} };
window.addEventListener('message', e => {
  if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
  let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
  const f = [...document.querySelectorAll('#vidBox .vid')].find(x => x.contentWindow === e.source); if (!f) return;
  const st = d.event === 'onStateChange' ? d.info : d.info && d.info.playerState;
  if (d.event === 'onError') { const E = { 2:'parâmetro inválido', 5:'erro do player HTML5', 100:'vídeo removido/privado', 101:'dono não permite incorporar', 150:'dono não permite incorporar (ou restrição de idade)', 153:'player sem origem/referência' }; if (f._next) f._next(`erro ${d.info} (${E[d.info] || 'desconhecido'})`); return; }
  if (st === 1 && !f._t0) diag('tocando');
  if (st === 1 && !f._t0) { f._t0 = Date.now(); vqReveal(f); }   // tocou: mostra na hora
  if (st === 0) { ytCmd(f, 'seekTo', [+f.dataset.start || 0, true]); ytCmd(f, 'playVideo'); }   // repetir sem "playlist" (que mostrava botões voltar/avançar)
});
// diagnóstico do vídeo (clique no "ⓘ vídeo" na linha de detalhes)
let vidDiag = null;
function diag(msg) { if (!vidDiag) return; vidDiag.steps.push(msg); const d = $('vdiag'); if (d) d.title = diagText(); }
function diagText() { if (!vidDiag) return ''; return `Busca: "${vidDiag.query}"\n\nResultados analisados:\n${(vidDiag.log || []).join('\n') || '(nenhum)'}\n\nPlayer:\n${vidDiag.steps.join('\n') || '(nada ainda)'}`; }
function diagBadge() {
  const m = [...$('details').querySelectorAll('.m')].pop(); if (!m || $('vdiag')) return;
  const s = document.createElement('a'); s.id = 'vdiag'; s.textContent = ' ⓘ vídeo'; s.style.cssText = 'margin-left:8px;opacity:.6;cursor:pointer';
  s.onclick = () => ask('Diagnóstico do vídeo', diagText(), 'OK'); s.title = diagText(); m.appendChild(s);
}
function playCandidate(g, list, k) {
  if (vidFor !== g || shown[gIdx] !== g) return;
  $('vidBox').querySelectorAll('.vid').forEach(x => x.remove());
  if (k >= list.length) { if (list.more) { list.more(); return; } diag('nenhum vídeo conseguiu tocar — ficando só com a capa'); $('vidBox').classList.remove('loading'); return; }
  const v = list[k];
  diag(`tentando ${k + 1}/${list.length}: ${v.id} — ${v.title} (início em ${v.start} s) → https://youtu.be/${v.id}`);
  const f = document.createElement('iframe');
  f.className = 'vid lite'; f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture'; f.allowFullscreen = true; f.tabIndex = -1; f.dataset.start = v.start;
  f._next = reason => { if (f._dead) return; f._dead = true; diag(`${v.id} falhou: ${reason}`); playCandidate(g, list, k + 1); };
  f.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&start=${v.start}&rel=0&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  f.onload = () => {
    setTimeout(() => { if (f.isConnected && !f._t0 && vidFor === g) f._next('não começou a tocar em 3 s (restrição de idade, bloqueio regional ou incorporação desativada)'); }, 3000);
    const t = setInterval(() => { if (!f.isConnected || f.classList.contains('on')) return clearInterval(t); try { f.contentWindow.postMessage(JSON.stringify({ event:'listening', id: 1 }), '*'); } catch (e) {} }, 250);
  };
  $('vidBox').classList.add('loading'); $('vidBox').appendChild(f);
}
function queueVideo(g) {
  stopVideo();
  if (bgKind !== 'video' || !document.hasFocus() || SMALL.matches) return;   // janela pequena: sem vídeo (economia)
  vidFor = g;
  vidTimer = setTimeout(async () => {   // espera o usuário "parar" no jogo (evita carregar vídeos ao rolar a lista)
    if (vidFor !== g || shown[gIdx] !== g) return;
    const name = cleanTitle(dn(g)) || dn(g), plat = sys.type === 'pc' ? 'PC' : sys.name;
    // buscas em sequência: se nenhum vídeo da 1ª tocar (ex.: jogos +18 com restrição de idade), tenta a próxima
    const queries = [`${name} ${plat} gameplay walkthrough`, `${name} ${plat} gameplay`, `${name} official trailer`];
    vidDiag = { query: queries[0], log: [], steps: [] }; diagBadge();
    const tried = new Set();
    const run = async qi => {
      if (qi >= queries.length || vidFor !== g || shown[gIdx] !== g) { if (qi >= queries.length) { diag('nenhum vídeo conseguiu tocar — ficando só com a capa'); $('vidBox').classList.remove('loading'); } return; }
      diag(`busca ${qi + 1}: "${queries[qi]}"`);
      let v; try { v = await api('/api/ytsearch?q=' + encodeURIComponent(queries[qi])); } catch (e) { diag('erro ao buscar: ' + e.message); return run(qi + 1); }
      if (vidFor !== g || shown[gIdx] !== g) return;
      vidDiag.log = vidDiag.log.concat(v.log || []);
      const list = (v.candidates || (v.id ? [v] : [])).filter(c => !tried.has(c.id)); list.forEach(c => tried.add(c.id));
      diag(`${list.length} vídeo(s) novo(s)`);
      list.more = () => run(qi + 1);
      playCandidate(g, list, 0);
    };
    run(0);
  }, 500);
}
window.addEventListener('blur', () => setTimeout(() => { const a = document.activeElement; if (a && a.classList && a.classList.contains('vid')) { a.blur(); window.focus(); return; } if (document.querySelector('#vidBox .vid')) stopVideo(); }, 0));   // clicar no player não para o vídeo; abrir um jogo, sim   // jogo aberto: libera o vídeo
window.addEventListener('focus', () => { if (document.querySelector('#vidBox .vid')) return; if (screen === 'games' && shown[gIdx]) queueVideo(shown[gIdx]); });
// troca de jogo: se capa e fundo já estão em cache, desenha na hora (sem placeholder); senão, placeholder
function paintCached(g) {
  const a = cachedArt(g); if (!a || !a.box) return false;
  const front = cp(a.box), ratio = ratioCache[front] || a.ratio;
  lastArt = { g, url: front, ratio, done: true };
  $('art').innerHTML = buildCase(g, front, false, ratio);
  const bgOver = covers['bg|' + coverKey(g)];
  setBg(cp(bgOver || a.snap || a.box), bgOver || a.snap ? 'game' : 'blur', true);
  return true;
}
// placeholder fixo (skeleton) do tamanho aproximado da capa do console, enquanto nada foi carregado
function skeletonCase(g) {
  const base = CASES[sys.type === 'pc' ? 'pc' : sys.id] || { r:.72 };
  const area = $('art').getBoundingClientRect(), small = area.width < 400;
  const H = Math.max(60, Math.min(area.height * (small ? .8 : .52), area.width * (small ? .78 : .45) / base.r)), W = H * base.r;
  return `<div class="skel" style="width:${W.toFixed(0)}px;height:${H.toFixed(0)}px"></div>`;
}
function clearBg() { bgCur = ''; bgTok++; $('gameBg').querySelectorAll('.bgl').forEach(o => o.remove()); }
// fundo com transição suave (crossfade entre a imagem antiga e a nova)
let bgCur = '', bgTok = 0;
async function setBg(url, mode, instant) {
  const id = url + '|' + mode; if (id === bgCur) return; bgCur = id;
  const tok = ++bgTok, host = $('gameBg');
  if (url && !instant) { const r = await Promise.race([loadImg(url), new Promise(r => setTimeout(() => r('t'), 1200))]); if (r === null && url.startsWith('/api/img?u=')) url = decodeURIComponent(url.slice(11)); }
  if (tok !== bgTok) return;
  const old = [...host.querySelectorAll('.bgl')];
  if (url) {
    const l = document.createElement('div'); l.className = 'bgl' + (mode ? ' ' + mode : ''); l.style.backgroundImage = `url("${url}")`;
    host.appendChild(l); requestAnimationFrame(() => requestAnimationFrame(() => l.classList.add('on')));
  }
  old.forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 700); });
}
// girar com o mouse (arrastar) e zoom (roda do mouse)
const view3d = { ry: 0, rx: 0, z: 1 };
const viewTf = () => `scale(${view3d.z}) rotateX(${view3d.rx}deg) rotateY(${view3d.ry}deg)`;
// zoom limitado: a capa nunca passa da sua área (painel da capa; com vídeo tocando, cresce para baixo/esquerda até o fim do vídeo)
function zoomMax() {
  const c = $('art').querySelector('.case3d'); if (!c) return 2.6;
  const base = { w: c.offsetWidth, h: c.offsetHeight }; if (!base.w) return 2.6;
  const right = $('art').closest('.right'), vid = right && right.classList.contains('vidplay');
  const art = $('art').getBoundingClientRect();
  let w, h;
  if (vid) { const vb = $('vidBox').getBoundingClientRect(), cr = c.getBoundingClientRect(); w = cr.right - vb.left; h = vb.bottom - cr.top; }
  else { w = art.width; h = art.height; }
  return Math.max(.5, Math.min(2.6, w / (base.w * 1.35), h / (base.h * 1.15)));   // folga para a lateral/rotação da caixa
}
function applyView() { view3d.z = Math.max(.5, Math.min(view3d.z, zoomMax())); const r = $('art').querySelector('.rot'); if (r) r.style.transform = viewTf(); }
(() => {
  const a = $('art'); let drag = null;
  a.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, ry: view3d.ry, rx: view3d.rx }; a.setPointerCapture(e.pointerId); a.style.cursor = 'grabbing'; });
  a.addEventListener('pointermove', e => { if (!drag) return; view3d.ry = drag.ry + (e.clientX - drag.x) * .5; view3d.rx = Math.max(-60, Math.min(60, drag.rx - (e.clientY - drag.y) * .35)); applyView(); });
  const end = () => { drag = null; a.style.cursor = 'grab'; };
  a.addEventListener('pointerup', end); a.addEventListener('pointercancel', end);
  a.addEventListener('wheel', e => { e.preventDefault(); view3d.z = Math.max(.5, Math.min(2.6, view3d.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); applyView(); }, { passive:false });
  a.addEventListener('dblclick', () => { view3d.ry = 0; view3d.rx = 0; view3d.z = 1; applyView(); });
  a.style.cursor = 'grab'; a.style.touchAction = 'none';
})();
async function showArt(g) {
  const my = ++artReq, box = $('art'), bg = $('gameBg');
  // troca de jogo: mostra na hora a caixa genérica do novo jogo (nunca a capa anterior)
  const pre = lastArt && lastArt.g === g && lastArt.done ? lastArt : null;   // já desenhada a partir do cache
  if (!pre) { lastArt = { g, url: null }; box.innerHTML = skeletonCase(g); }

  const a = await resolveArt(g);
  if (my !== artReq || shown[gIdx] !== g || screen !== 'games') return;
  let front = cp(a.box), ratio = front ? ratioCache[front] : undefined;
  // a caixa assume o formato da imagem (horizontal/vertical); espera no máx. 0,3 s pela medida
  const TO = new Promise(r => setTimeout(() => r(undefined), 300));
  let pr = front && ratio === undefined ? loadRatio(front) : null;
  if (pr) ratio = await Promise.race([pr, TO]);
  if (ratio === null && front !== a.box) { front = a.box; pr = loadRatio(front); ratio = await Promise.race([pr, new Promise(r => setTimeout(() => r(undefined), 300))]); }   // cache falhou (ex.: Fandom): usa direto da internet
  if (my !== artReq) return;
  if (ratio && cacheOn && artDisk[coverKey(g)] && artDisk[coverKey(g)].ratio !== ratio) { artDisk[coverKey(g)].ratio = ratio; api('/api/artcache', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: coverKey(g), val: artDisk[coverKey(g)] }) }).catch(() => {}); }   // guarda o formato para desenhar na hora da próxima vez
  if (pre && pre.url === front && (pre.ratio || 0) === (ratio || pre.ratio || 0)) { if (a.logo) spineLogo(a.logo, my); }   // já está na tela: não redesenha
  else {
  lastArt = { g, url: front, ratio, done: true };
  box.innerHTML = buildCase(g, front, !pre, ratio);   // começa virada para trás (só quando não veio do cache)
  if (a.logo) spineLogo(a.logo, my);
  if (ratio === undefined && pr) pr.then(rr => { if (rr && my === artReq) { lastArt.ratio = rr; box.innerHTML = buildCase(g, front, false, rr); } });
  requestAnimationFrame(() => requestAnimationFrame(() => { const f = box.querySelector('.flip'); if (f) f.classList.remove('back'); }));   // gira para a frente (0,3 s)
  }
  const lbl = { libretro:'capa: libretro', gametdb:'capa: GameTDB', wikimain:'capa: Wikipédia', xlenore:'capa: xlenore', steam:'capa: Steam', fandom:'capa: Fandom', pcgw:'capa: PCGamingWiki', strategywiki:'capa: StrategyWiki', manual:'capa escolhida manualmente', generica:'capa genérica (não encontrada)' }[a.src];
  // segunda imagem de fundo: tela do jogo (ou a capa desfocada) no lugar do fundo do console
  const bgOver = covers['bg|' + coverKey(g)];
  const bgUrl = cp(bgOver || a.snap || a.box);
  setBg(bgUrl || bgUrlOf(sys), bgOver || a.snap ? 'game' : a.box ? 'blur' : '');
  if (!bgOver) queueVideo(g); else stopVideo();   // fundo escolhido manualmente tem prioridade sobre o vídeo
}
window.addEventListener('resize', () => { if (lastArt && !lastArt.done) return rerenderCase(); if (lastArt && screen === 'games' && shown[gIdx] === lastArt.g) $('art').innerHTML = buildCase(lastArt.g, lastArt.url, false, lastArt.ratio); if (lastArt.logo) { const sp = $('art').querySelector('.spine'); if (sp) sp.innerHTML = `<img class="spl" src="${esc(lastArt.logo)}" alt="">`; } });
