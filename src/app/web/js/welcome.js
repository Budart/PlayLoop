// PlayLoop — welcome.js
/* ---------- boas-vindas (primeira abertura) ---------- */
// passo 1: como organizar as pastas (ilustrado) — sem sugerir nenhum caminho
const WF = '<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h9A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" fill="#f5b942"/></svg>';
const WE = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="#3b82f6"/><path d="M9 9l6 3-6 3z" fill="#fff"/></svg>';
const WR = '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" fill="#8b5cf6"/><rect x="8" y="6" width="8" height="5" rx="1" fill="#fff" opacity=".85"/></svg>';
const wrow = (lvl, ico, name, note) => `<div class="wt" style="--l:${lvl}">${ico}<b>${name}</b>${note ? `<i>${note}</i>` : ''}</div>`;
const WEL_TREE = `<span>Organize assim e o PlayLoop faz o resto: <b>ele encontra os consoles, os emuladores e os jogos e configura tudo automaticamente.</b></span>
<div class="wtree">
  ${wrow(0, WF, 'Uma pasta principal', 'é ela que você escolhe abaixo')}
  ${wrow(1, WF, 'Super Nintendo', 'uma subpasta por console, com o nome dele')}
  ${wrow(2, WE, 'emulador (.exe)', 'o programa do emulador pode ficar aqui dentro')}
  ${wrow(2, WF, 'ROMs', 'os jogos desse console')}
  ${wrow(3, WR, 'jogo.sfc · jogo.zip …', '')}
  ${wrow(1, WF, 'PlayStation 2', '')}
  ${wrow(2, WE, 'emulador (.exe)', '')}
  ${wrow(2, WF, 'ROMs', '')}
  ${wrow(1, WF, '…', 'um console por pasta')}
</div>
<ul class="wtips"><li>Use o nome do console na pasta (ex.: <b>Nintendo 64</b>, <b>Mega Drive</b>, <b>PSP</b>) — abreviações conhecidas como <b>SNES</b> ou <b>GBA</b> também funcionam.</li><li>Jogos em <b>.zip</b> e <b>.7z</b> são aceitos na maioria dos consoles.</li><li>Faltou algo? Dá para ajustar depois em <b>Configuração → Consoles</b>.</li></ul>`;
function runWelcome() {
  return new Promise(async resolve => {
    show('welcome'); let st = 0; const picks = { root: '', pc: '', sgdbKey: '' };
    let suggest = ''; try { suggest = (await api('/api/setup')).suggest || ''; } catch (e) {}
    const steps = [
      { k: 'root', n: 'Passo 1 de 3', t: 'Onde estão seus emuladores?', p: 'Escolha a pasta principal onde ficam os emuladores e as ROMs (uma subpasta por console). O PlayLoop encontra tudo sozinho.', skip: false },
      { k: 'pc', n: 'Passo 2 de 3', t: 'E os seus jogos de PC?', p: 'Escolha a pasta onde você guarda os atalhos dos jogos instalados no computador. Se não quiser, é só pular.', skip: true },
      { k: 'sgdbKey', n: 'Passo 3 de 3 · opcional', t: 'Quer capas ainda mais bonitas?', key: true, skip: true },
    ];
    const render = () => {
      const s = steps[st];
      $('wStepN').textContent = s.n; $('wTitle').textContent = s.t;
      if (s.key) {   // SteamGridDB: explica, guia com links e recebe a chave
        $('wText').innerHTML = SGDB_HELP + `<input id="wKey" placeholder="Cole aqui a chave da API" value="${esc(picks.sgdbKey)}" style="width:100%;margin-top:10px;background:#0e0b1a;border:1px solid #4a3f70;color:#fff;border-radius:8px;padding:10px 12px;font-size:14px">`;
        bindLinks($('wText')); $('wKey').oninput = () => { picks.sgdbKey = $('wKey').value.trim(); $('wNext').disabled = !picks.sgdbKey; };
        $('wPath').style.display = 'none'; $('wPick').style.display = 'none';
      } else { if (s.k === 'root') $('wText').innerHTML = WEL_TREE; else $('wText').textContent = s.p; $('wPath').style.display = ''; $('wPick').style.display = ''; }
      $('wPath').textContent = picks[s.k] || 'Nenhuma pasta escolhida'; $('wPath').classList.toggle('ok', !!picks[s.k]);
      $('wSkip').style.display = s.skip ? '' : 'none';
      $('wNext').textContent = st === steps.length - 1 ? 'Concluir' : 'Continuar'; $('wNext').disabled = !picks[s.k] && !s.skip;
      $('wSkip').textContent = s.key ? 'Continuar sem' : 'Pular';
      if (s.key) { $('wNext').textContent = 'Salvar chave e prosseguir'; $('wNext').disabled = !picks.sgdbKey; }
    };
    $('wPick').onclick = async () => {
      try { const r = await api('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: 'folderabs', start: picks[steps[st].k] || '' }) }); if (r.path) { picks[steps[st].k] = r.path; sfx('ok'); render(); } } catch (e) { toast(e.message, true); }
    };
    const next = async () => {
      if (st < steps.length - 1) { st++; sfx('move'); render(); return; }
      $('wTitle').textContent = 'Preparando tudo...'; $('wText').textContent = 'Procurando consoles, emuladores e jogos. Isso leva só alguns segundos.';
      $('wPath').style.display = 'none'; document.querySelector('.wbtns').style.display = 'none'; $('wStepN').textContent = '';
      try { const r = await api('/api/setup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(picks) }); sfx('launch'); toast(`${r.consoles} consoles encontrados!`); }
      catch (e) { toast('Erro: ' + e.message, true); }
      setTimeout(() => { location.href = '/'; }, 700);
    };
    $('wNext').onclick = next;
    $('wSkip').onclick = () => { picks[steps[st].k] = ''; next(); };
    render();
    setTimeout(() => $('wCard').classList.add('on'), 850);   // logo aparece e some em menos de 1 s
  });
}
