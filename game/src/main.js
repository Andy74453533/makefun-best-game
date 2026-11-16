// Boot: wire the modules together, handle resize and focus, and serve the
// deterministic screenshot scenes when ?shot= is present.

import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { bindHud } from './hud.js';
import { bindScreens } from './screens.js';
import { createGame, loadBest } from './game.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = bindHud();
const screens = bindScreens({
  onStart: () => game.start(),
  onRestart: () => game.start(),
  onResume: () => game.resume(),
  onQuitToTitle: () => game.quitToTitle(),
  onMute: () => screens.setMuteLabel(audio.toggleMuted()),
});
const game = createGame({ input, audio, renderer, hud, screens });

window.__game = game;

function onResize() {
  renderer.resize();
  game.refreshBounds();
}
window.addEventListener('resize', onResize);
onResize();

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state.mode === 'playing') game.pause();
});
window.addEventListener('blur', () => {
  if (game.state.mode === 'playing') game.pause();
});

// Screen-reader status line: a one-line summary of where the run stands.
const statusEl = document.getElementById('status');
window.setInterval(() => {
  const s = game.state;
  if (s.mode === 'playing') {
    statusEl.textContent = `Playing. Wave ${s.director.wave} of 10. Health ${Math.ceil(s.player.hp)} of ${s.player.maxHp}. Score ${s.score}.`;
  } else if (s.mode === 'levelup') {
    statusEl.textContent = 'Level up. Choose a boon.';
  } else if (s.mode === 'paused') {
    statusEl.textContent = 'Paused.';
  } else if (s.mode === 'gameover') {
    statusEl.textContent = `Game over. Score ${s.score}.`;
  } else if (s.mode === 'victory') {
    statusEl.textContent = `Victory. Score ${s.score}.`;
  } else {
    statusEl.textContent = 'Lanternfall title screen. Press Enter or click Begin the night.';
  }
}, 600);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Deterministic capture: step the real sim, render once, signal readiness.
  const seed = Number(params.get('seed')) || 7;
  screens.showTitle(loadBest());
  screens.setMuteLabel(false);
  hud.hide();
  applyShot(game, shot, seed);
  // Shot setup runs synchronously, so time-based UI (the wave banner, the
  // HUD labels) is settled by hand to match the arranged state.
  document.getElementById('banner').classList.add('hidden');
  if (game.state.player) {
    hud.update(game.state);
    if (game.state.boss) hud.setBossHp(game.state.boss.hp / game.state.boss.maxHp);
  }
  if (game.state.mode === 'playing' || game.state.mode === 'levelup') {
    hud.show();
  }
  renderer.draw(game.state);
  window.__shotReady = true;
} else {
  screens.showTitle(loadBest());
  screens.setMuteLabel(false);
  hud.hide();
  game.run();
}
