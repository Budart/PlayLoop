// PlayLoop — welcome.js
/* ---------- boas-vindas (primeira abertura) ---------- */
function runWelcome() {
  return new Promise(async resolve => {
    show('welcome'); let st = 0; const picks = { root: '', pc: '', sgdbKey: '' };
    let suggest = ''; try { suggest = (await api('/api/setup')).suggest || ''; } catch (e) {}
    const steps = [
      { k: 'root', n: 'Passo 1 de 3', t: 'Onde estão seus emuladores?', p: 'Escolha a pasta principal onde ficam os emuladores e as ROMs (uma subpasta por console). O PlayLoop encontra tudo sozinho.', skip: false },
      { k: 'pc', n: 'Passo 2 de 3', t: 'E os seus jogos de PC?', p: 'Escolha a pasta com os atalhos dos jogos instalados no computador (por exemplo, a Área de Trabalho). Se não quiser, é só pular.', skip: true },
      { k: 'sgdbKey', n: 'Passo 3 de 3 · opcional', t: 'Quer capas ainda mais bonitas?', key: true, skip: true },
    ];
    if (suggest) picks.root = suggest;
    const render = () => {
      const s = steps[st];
      $('wStepN').textContent = s.n; $('wTitle').textContent = s.t;
      if (s.key) {   // SteamGridDB: explica, guia com links e recebe a chave
        $('wText').innerHTML = SGDB_HELP + `<input id="wKey" placeholder="Cole aqui a chave da API" value="${esc(picks.sgdbKey)}" style="width:100%;margin-top:10px;background:#0e0b1a;border:1px solid #4a3f70;color:#fff;border-radius:8px;padding:10px 12px;font-size:14px">`;
        bindLinks($('wText')); $('wKey').oninput = () => { picks.sgdbKey = $('wKey').value.trim(); $('wNext').disabled = !picks.sgdbKey; };
        $('wPath').style.display = 'none'; $('wPick').style.display = 'none';
      } else { $('wText').textContent = s.p; $('wPath').style.display = ''; $('wPick').style.display = ''; }
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
