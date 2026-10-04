// abertura: a tela de consoles se monta — fundo surge, consoles sobem em cascata a partir do centro, o atual chega por último com um brilho
function bootAnim() {
  try { if (sessionStorage.getItem('introDone')) return; sessionStorage.setItem('introDone', '1'); } catch (e) {}
  const cards = [...document.querySelectorAll('#track .sys')], cur = cards.findIndex(c => c.classList.contains('cur'));
  cards.forEach((c, k) => c.style.setProperty('--bd', Math.abs(k - cur)));
  document.body.classList.add('boot');
  try { if (typeof muted === 'undefined' || !muted) {
    const C = new (window.AudioContext || window.webkitAudioContext)(), t = C.currentTime, tn = (at, f, d, v, ty) => { const o = C.createOscillator(), g = C.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(v, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + d); o.connect(g).connect(C.destination); o.start(t + at); o.stop(t + at + d + .05); };
    for (let k = 1; k <= Math.min(5, cards.length); k++) tn(.25 + k * .07, 900 + k * 120, .06, .03, 'square');   // cascata de cliques dos consoles
    [523, 659, 784, 1047].forEach((f, i) => tn(.85 + i * .05, f, i === 3 ? .9 : .35, .06, 'triangle'));     // acorde quando o console atual chega
    setTimeout(() => C.close(), 2500);
  } } catch (e) {}
  const end = () => { document.body.classList.remove('boot'); cards.forEach(c => c.style.removeProperty('--bd')); removeEventListener('keydown', skip, true); };
  const skip = () => end();
  setTimeout(end, 2200); addEventListener('keydown', skip, true);
}
