// Koru — audio.js
/* ---------- sons da interface + músicas (geradas na hora, 100% originais, sem arquivos) ---------- */
let muted = false; try { muted = localStorage.getItem('mute') === '1'; } catch (e) {}
let AC = null, master = null, sfxBus = null, musBus = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = .35; sfxBus.connect(master);
    musBus = AC.createGain(); musBus.gain.value = .16; musBus.connect(master);
    // eco suave para a música
    const dl = AC.createDelay(); dl.delayTime.value = .28; const fb = AC.createGain(); fb.gain.value = .28; const wet = AC.createGain(); wet.gain.value = .3;
    musBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(bus, t, freq, dur, type, vol, glideTo) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .02);
}
function noise(bus, t, dur, vol, hp) {
  const len = Math.ceil(AC.sampleRate * dur), b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = b; f.type = 'highpass'; f.frequency.value = hp || 6000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(bus); src.start(t);
}
function sfx(kind) {
  if (muted) return; try { audio(); } catch (e) { return; }
  const t = AC.currentTime;
  if (kind === 'tick') tone(sfxBus, t, 1250, .04, 'square', .12);
  else if (kind === 'move') { tone(sfxBus, t, 520, .07, 'triangle', .5, 780); }
  else if (kind === 'ok') { tone(sfxBus, t, 660, .08, 'square', .18); tone(sfxBus, t + .07, 990, .12, 'square', .18); }
  else if (kind === 'back') { tone(sfxBus, t, 700, .08, 'triangle', .45); tone(sfxBus, t + .07, 470, .12, 'triangle', .45); }
  else if (kind === 'launch') [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, t + i * .07, f, .22, 'square', .16));
}
// estilos musicais por console
const STYLES = {
  home:   { bpm: 92,  lead:'triangle', bass:'sine',     arp:'sine',     mode:'major',  drums:0, seed:11 },
  snes:   { bpm: 112, lead:'square',   bass:'triangle', arp:'triangle', mode:'major',  drums:1, seed:21 },
  n64:    { bpm: 100, lead:'sine',     bass:'triangle', arp:'triangle', mode:'lydian', drums:1, seed:31 },
  gbc:    { bpm: 140, lead:'square',   bass:'square',   arp:'square',   mode:'major',  drums:1, seed:41 },
  gba:    { bpm: 132, lead:'square',   bass:'triangle', arp:'square',   mode:'mixo',   drums:1, seed:47 },
  nds:    { bpm: 116, lead:'triangle', bass:'sine',     arp:'square',   mode:'major',  drums:1, seed:53 },
  '3ds':  { bpm: 120, lead:'triangle', bass:'sine',     arp:'triangle', mode:'lydian', drums:1, seed:59 },
  wii:    { bpm: 104, lead:'sine',     bass:'sine',     arp:'sine',     mode:'major',  drums:0, seed:61 },
  switch: { bpm: 122, lead:'square',   bass:'triangle', arp:'sine',     mode:'mixo',   drums:1, seed:67 },
  sms:    { bpm: 150, lead:'sawtooth', bass:'square',   arp:'square',   mode:'dorian', drums:1, seed:71 },
  genesis:{ bpm: 148, lead:'sawtooth', bass:'sawtooth', arp:'square',   mode:'minor',  drums:1, seed:73 },
  neogeo: { bpm: 144, lead:'sawtooth', bass:'square',   arp:'sawtooth', mode:'minor',  drums:1, seed:79 },
  ps1:    { bpm: 90,  lead:'sine',     bass:'triangle', arp:'sine',     mode:'minor',  drums:1, seed:83 },
  ps2:    { bpm: 84,  lead:'triangle', bass:'sine',     arp:'sine',     mode:'dorian', drums:0, seed:89 },
  psp:    { bpm: 100, lead:'triangle', bass:'sine',     arp:'triangle', mode:'dorian', drums:1, seed:97 },
  pc:     { bpm: 108, lead:'square',   bass:'sawtooth', arp:'triangle', mode:'dorian', drums:1, seed:107 },
  ps3:    { bpm: 78,  lead:'sine',     bass:'sine',     arp:'sine',     mode:'minor',  drums:0, seed:101 },
};
const MODES = { major:[0,2,4,5,7,9,11], lydian:[0,2,4,6,7,9,11], mixo:[0,2,4,5,7,9,10], dorian:[0,2,3,5,7,9,10], minor:[0,2,3,5,7,8,10] };
const PROGS = [[0,5,3,4],[0,3,4,4],[5,3,0,4],[0,4,5,3],[0,2,3,4],[5,4,3,4]];
function rng(seed) { let x = seed * 9301 + 49297; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
function buildSong(id) {
  const st = STYLES[id] || Object.assign({}, STYLES.home, { seed: [...id].reduce((a, c) => a + c.charCodeAt(0), 0) });
  const r = rng(st.seed), sc = MODES[st.mode], root = 48 + Math.floor(r() * 7);
  const prog = PROGS[Math.floor(r() * PROGS.length)];
  const deg = d => root + 12 * Math.floor(d / 7) + sc[((d % 7) + 7) % 7];
  // motivo de 2 compassos, repetido com variação
  const motif = []; let d = 7 + Math.floor(r() * 3);
  for (let i = 0; i < 32; i++) { if (r() < .45) { d += Math.floor(r() * 5) - 2; d = Math.max(5, Math.min(13, d)); motif.push(d); } else motif.push(null); }
  return { st, prog, deg, motif, r };
}
const music = {
  song: null, id: null, step: 0, next: 0, timer: null, paused: false,
  play(id) {
    if (this.id === id && this.timer) return;
    this.id = id; this.song = buildSong(id); this.step = 0; this.paused = false;
    if (!AC || muted) return;
    this.start();
  },
  start() { return;   // música removida
    if (!this.song || muted) return;
    audio(); clearInterval(this.timer);
    musBus.gain.cancelScheduledValues(AC.currentTime); musBus.gain.setValueAtTime(0, AC.currentTime); musBus.gain.linearRampToValueAtTime(.16, AC.currentTime + 1.2);
    this.next = AC.currentTime + .1;
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop() { clearInterval(this.timer); this.timer = null; },
  pause() { if (!AC) return; this.paused = true; musBus.gain.linearRampToValueAtTime(0, AC.currentTime + .6); setTimeout(() => { if (this.paused) this.stop(); }, 700); },
  resume() { if (this.paused) { this.paused = false; this.start(); } },
  tick() {
    const { st, prog, deg, motif } = this.song, spb = 60 / st.bpm / 4;   // semicolcheias
    while (this.next < AC.currentTime + .12) {
      const t = this.next, s = this.step % 128, bar = Math.floor(s / 16) % 4, pos = s % 16, ch = prog[bar];
      const f = n => 440 * Math.pow(2, (n - 69) / 12);
      if (pos === 0 || pos === 8 || (pos === 14 && st.drums)) tone(musBus, t, f(deg(ch) - 12), spb * 3.5, st.bass, .55);
      if (pos % 2 === 0) tone(musBus, t, f(deg(ch + [0, 2, 4, 7][(pos / 2) % 4])), spb * 1.8, st.arp, .16);
      const m = motif[s % 32] , half = Math.floor(s / 32) % 4;
      if (m !== null && half !== 3) tone(musBus, t, f(deg(m + (half === 2 ? 2 : 0) + ch % 2)), spb * 2.6, st.lead, .22);
      if (st.drums) { if (pos === 0 || pos === 8) tone(musBus, t, 120, .18, 'sine', .7, 40); if (pos % 4 === 2) noise(musBus, t, .05, .12); if (pos === 4 || pos === 12) noise(musBus, t, .12, .2, 1800); }
      this.next += spb; this.step++;
    }
  }
};
function setMute(m) {
  muted = m; try { localStorage.setItem('mute', m ? '1' : '0'); } catch (e) {}
  $('mute').textContent = m ? '🔇' : '🔊'; ['gMute', 'fgMute'].forEach(id => { const b = $(id); if (b) b.textContent = m ? '🔇' : '🔊'; }); if (typeof vidApplySound === 'function') vidApplySound();
  if (AC) master.gain.setTargetAtTime(m ? 0 : 1, AC.currentTime, .05);
  if (!m) { audio(); if (!music.timer) music.start(); } else music.stop();
}
$('mute').onclick = () => { setMute(!muted); $('mute').blur(); };
['gMute', 'fgMute'].forEach(id => { const b = $(id); if (!b) return; b.textContent = muted ? '🔇' : '🔊'; b.onclick = e => { e.stopPropagation(); setMute(!muted); b.blur(); }; });
$('mute').textContent = muted ? '🔇' : '🔊';
music.play('home');
// navegadores só liberam áudio após a primeira interação
const unlock = () => { if (!muted) { audio(); if (!music.timer && !music.paused) music.start(); } };
document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock);
// pausa a música quando a janela perde o foco (ex.: jogo aberto) e volta depois
window.addEventListener('blur', () => { if (music.timer) music.pause(); });
window.addEventListener('focus', () => { if (!muted) music.resume(); });
