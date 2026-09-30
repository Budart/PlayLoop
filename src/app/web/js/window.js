// PlayLoop — window.js
/* ---------- janela (barra de título do Windows) + tela cheia com F11 / Alt+Enter ---------- */
const host = window.chrome && window.chrome.webview;
if (host) document.body.classList.add('host');
window.addEventListener('keydown', e => {
  if (e.key === 'F11' || (e.key === 'Enter' && e.altKey)) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (host) host.postMessage('fs');
    else if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }
}, true);
