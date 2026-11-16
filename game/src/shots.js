// Deterministic screenshot scenes. Each scene drives the real simulation a
// fixed number of fixed steps from a fixed seed, then renders one frame.
// Used only with ?shot=<scene>&seed=<n>; normal play never touches this.

import { CONFIG, xpForLevel } from './config.js';

function patrolInput(game, stepIndex) {
  const { state } = game;
  const input = state.input;
  // Walk a slow square around the courtyard centre.
  const phase = Math.floor(stepIndex / 70) % 4;
  const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  for (const key of keys) input.releaseKey(key);
  input.simulateKey(keys[phase]);
  // Aim at the nearest foe, or off to the right when the field is clear.
  let target = null;
  let best = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (dist < best) {
      best = dist;
      target = enemy;
    }
  }
  if (target) input.setMouse(target.x, target.y);
  else input.setMouse(state.player.x + 220, state.player.y - 60);
}

function runSteps(game, count, drive = null) {
  for (let i = 0; i < count; i += 1) {
    if (drive) drive(i);
    game.step(CONFIG.step);
    game.state.renderTime += CONFIG.step;
  }
}

// Level-ups can queue; pick the first card until play resumes (capped so a
// broken scene can never loop forever).
function drainLevelUps(game) {
  for (let i = 0; i < 6 && game.state.mode === 'levelup'; i += 1) {
    game.pickBoon(0);
  }
}

export function applyShot(game, name, seed) {
  const { state } = game;
  if (name === 'title') {
    state.renderTime = 4.2;
    return;
  }

  game.start(seed);

  if (name === 'play') {
    // Mid-run, mid-combat: wave 3 in progress, a build forming, a busy field.
    runSteps(game, 60, (i) => patrolInput(game, i));
    state.director.wave = 3;
    state.director.phase = 'active';
    state.director.timer = 20;
    state.director.remaining = 12;
    state.director.spawnTimer = 0;
    state.player.orbitals = 1;
    state.player.boltCount = 2;
    state.stacks = { orbit: 1, split: 1, sharp: 1 };
    state.level = 3;
    state.xpNext = xpForLevel(3);
    state.score = 640;
    state.kills = 15;
    state.time = 96;
    // A ring of foes closing in, plus starlight on the ground.
    const p = state.player;
    const b = state.bounds;
    const kinds = ['wisp', 'skitter', 'husk', 'spitter', 'wraith', 'wisp', 'skitter', 'wisp', 'husk', 'skitter'];
    kinds.forEach((kind, i) => {
      const angle = (i / kinds.length) * Math.PI * 2;
      const dist = 240 + (i % 3) * 70;
      const x = Math.max(b.left + 30, Math.min(b.right - 30, p.x + Math.cos(angle) * dist));
      const y = Math.max(b.top + 30, Math.min(b.bottom - 30, p.y + Math.sin(angle) * dist));
      game.debug.spawnAt(kind, x, y);
    });
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      state.motes.push({
        x: p.x + Math.cos(angle) * 110,
        y: p.y + Math.sin(angle) * 110,
        vx: 0, vy: 0, value: 1, phase: i, age: 0,
      });
    }
    runSteps(game, 45, (i) => patrolInput(game, i + 60));
    drainLevelUps(game);
    state.xp = 6;
    state.streak = 6;
    state.streakAt = state.time;
    return;
  }

  if (name === 'boon') {
    // Feed the keeper starlight until the level-up screen opens.
    for (let i = 0; i < 14; i += 1) {
      state.motes.push({
        x: state.player.x + (i % 4) * 8 - 12,
        y: state.player.y + Math.floor(i / 4) * 8 - 8,
        vx: 0, vy: 0, value: 1, phase: i, age: 0,
      });
    }
    runSteps(game, 240, (i) => patrolInput(game, i));
    state.director.wave = 3;
    state.time = 95;
    state.score = 380;
    state.kills = 14;
    return;
  }

  if (name === 'boss') {
    runSteps(game, 60, (i) => patrolInput(game, i));
    game.debug.spawnBoss();
    state.director.wave = 10;
    state.director.phase = 'active';
    state.director.bossSpawned = true;
    state.director.bossAlive = true;
    runSteps(game, 300, (i) => patrolInput(game, i + 60));
    drainLevelUps(game);
    state.score = 5200;
    state.kills = 64;
    state.time = 380;
    state.level = 7;
    state.xp = 10;
    state.xpNext = xpForLevel(7);
    state.player.hp = 82;
    state.player.hurtFlash = 0;
    state.player.invulnerable = 0;
    if (state.boss) state.boss.hp = Math.round(state.boss.maxHp * 0.6);
    return;
  }

  if (name === 'victory') {
    runSteps(game, 60, (i) => patrolInput(game, i));
    state.score = 7480;
    state.kills = 87;
    state.level = 8;
    state.time = 432;
    state.director.wave = 10;
    state.player.hp = 62;
    game.debug.forceEnd('victory');
    runSteps(game, 80);
    return;
  }

  if (name === 'gameover') {
    runSteps(game, 60, (i) => patrolInput(game, i));
    state.score = 1290;
    state.kills = 23;
    state.level = 3;
    state.time = 187;
    state.director.wave = 4;
    game.hitPlayer(9999, state.player.x, state.player.y);
    runSteps(game, 80);
    return;
  }

  throw new Error(`Unknown shot scene: ${name}`);
}
