// PlayLoop — abertura: anel desenha o "loop", símbolo salta, faíscas, letras sobem, brilho passa e a tela se abre
(function () {
  const el = document.getElementById('intro'); if (!el) return;
  if (sessionStorage.getItem('introDone')) { el.remove(); return; }   // só na abertura do app (não ao recarregar a página)
  document.body.classList.add('introOn');
  const burst = el.querySelector('.inBurst'), cols = ['#00D1FF', '#7C3AED', '#60A5FA', '#A78BFA', '#fff'];
  for (let i = 0; i < 22; i++) { const s = document.createElement('i'), a = i / 22 * Math.PI * 2, d = 110 + Math.random() * 90; s.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${cols[i % 5]};color:${cols[i % 5]};animation-delay:${1.1 + Math.random() * .08}s`; burst.appendChild(s); }
  el.querySelectorAll('.inWord > *').forEach((c, i) => c.style.animationDelay = (1.25 + i * .055) + 's');
  // som: acorde subindo quando o anel fecha (se o áudio do app estiver liberado)
  setTimeout(() => { try { if (typeof muted !== 'undefined' && muted) return; const C = new (window.AudioContext || window.webkitAudioContext)(), t = C.currentTime;
    [392, 523, 659, 784, 1047].forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = i < 4 ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + i * .06); g.gain.linearRampToValueAtTime(.07, t + i * .06 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .06 + (i === 4 ? 1.1 : .45)); o.connect(g).connect(C.destination); o.start(t + i * .06); o.stop(t + i * .06 + 1.2); });
    setTimeout(() => C.close(), 2000); } catch (e) {} }, 1050);
  let done = false;
  const end = skip => { if (done) return; done = true; try { sessionStorage.setItem('introDone', '1'); } catch (e) {} if (skip) el.classList.add('skip');
    setTimeout(() => { document.body.classList.add('introEnd'); document.body.classList.remove('introOn'); }, skip ? 0 : 0);
    setTimeout(() => { el.remove(); document.body.classList.remove('introEnd'); removeEventListener('keydown', k, true); }, skip ? 400 : 1300); };
  const k = e => { e.stopPropagation(); e.preventDefault(); end(true); };
  setTimeout(() => end(false), 2150);
  addEventListener('keydown', k, true); el.addEventListener('pointerdown', () => end(true));
})();
