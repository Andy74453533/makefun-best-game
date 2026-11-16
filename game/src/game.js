// The game itself: the state machine, the fixed-step simulation, collisions,
// scoring, levelling and the win/lose flow. Everything else plugs in here.

import { CONFIG, PALETTE, xpForLevel } from './config.js';
import { makeRng } from './rng.js';
import { createPlayer, updatePlayer, tryDash, damagePlayer, healPlayer } from './player.js';
import { spawnEnemy, updateEnemy, separateEnemies } from './enemies.js';
import { createArsenal, updateWeapons, damageEnemy, castNova, spawnGlob } from './weapons.js';
import { rollBoons } from './boons.js';
import { createDirector, updateDirector, onBossDefeated } from './waves.js';
import { createParticles } from './particles.js';

const BEST_KEY = 'lanternfall-best-score';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (error) {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch (error) {
    // Private browsing or a sandboxed frame: the run simply is not kept.
  }
}

export function createGame(deps) {
  const { input, audio, renderer, hud, screens } = deps;
  const particles = createParticles();
  const state = {
    mode: 'title', // title | playing | paused | levelup | gameover | victory
    time: 0,
    renderTime: 0,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    best: loadBest(),
    streak: 0,
    streakAt: -99,
    shake: 0,
    bounds: { left: 30, top: 30, right: 300, bottom: 300 },
    player: null,
    enemies: [],
    motes: [],
    arsenal: createArsenal(),
    director: createDirector(),
    particles,
    rng: makeRng(1),
    stacks: {},
    pendingLevels: 0,
    boonChoices: [],
    boss: null,
    endTimer: 0,
    pendingEnd: null,
    input,
    audio,
  };

  function refreshBounds() {
    const margin = CONFIG.wallMargin;
    state.bounds = {
      left: margin,
      top: margin + 46,
      right: renderer.width - margin,
      bottom: renderer.height - margin - 30,
    };
  }

  function reset(seed) {
    refreshBounds();
    const b = state.bounds;
    state.rng = makeRng(seed);
    state.mode = 'playing';
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNext = xpForLevel(1);
    state.streak = 0;
    state.streakAt = -99;
    state.shake = 0;
    state.player = createPlayer((b.left + b.right) / 2, (b.top + b.bottom) / 2);
    state.enemies = [];
    state.motes = [];
    state.arsenal = createArsenal();
    state.director = createDirector();
    state.stacks = {};
    state.pendingLevels = 0;
    state.boonChoices = [];
    state.boss = null;
    state.endTimer = 0;
    state.pendingEnd = null;
    particles.clear();
    hud.hideBoss();
  }

  function start(seed = (Date.now() % 2147483647) + 1) {
    audio.ensure();
    reset(seed);
    screens.hideAll();
    hud.show();
    hud.banner('Survive the night', 'Ten waves. One lantern. Hold the light.');
    audio.startMusic();
  }

  function quitToTitle() {
    state.mode = 'title';
    audio.stopMusic();
    hud.hide();
    hud.hideBoss();
    screens.showTitle(state.best);
  }

  function pause() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    screens.showPause();
  }

  function resume() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    screens.hideAll();
  }

  function gainXp(amount) {
    state.xp += amount * state.player.xpGain;
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.level += 1;
      state.xpNext = xpForLevel(state.level);
      state.pendingLevels += 1;
    }
    if (state.pendingLevels > 0 && state.mode === 'playing') openLevelUp();
  }

  function openLevelUp() {
    state.mode = 'levelup';
    state.boonChoices = rollBoons(state.rng, state.stacks, 3);
    audio.play('levelup');
    screens.showLevelUp(state.boonChoices, state.stacks, pickBoon);
  }

  function pickBoon(index) {
    if (state.mode !== 'levelup') return;
    const boon = state.boonChoices[index];
    if (!boon) return;
    boon.apply(state.player, state);
    state.stacks[boon.id] = (state.stacks[boon.id] || 0) + 1;
    state.pendingLevels -= 1;
    audio.play('click');
    particles.burst(state.player.x, state.player.y, { count: 22, color: PALETTE.lantern, speed: 200, life: 0.6, size: 3 });
    if (state.pendingLevels > 0) {
      openLevelUp();
    } else {
      state.mode = 'playing';
      screens.hideAll();
    }
  }

  function hitPlayer(damage, x, y, attacker = null) {
    const hpBefore = state.player.hp;
    const died = damagePlayer(state.player, damage);
    const applied = died || state.player.hp < hpBefore;
    if (applied) {
      state.shake = Math.min(16, state.shake + 6);
      particles.burst(x, y, { count: 12, color: PALETTE.danger, speed: 220, life: 0.4, size: 3 });
      audio.play('hurt');
    }
    if (attacker && state.player.thorns > 0 && attacker.hp > 0) {
      damageEnemy(state, attacker, state.player.thorns, state.rng, attacker.x, attacker.y);
    }
    if (died) {
      state.pendingEnd = 'gameover';
      state.endTimer = 0.9;
      particles.burst(state.player.x, state.player.y, { count: 60, color: PALETTE.lantern, speed: 320, life: 0.9, size: 4 });
      particles.burst(state.player.x, state.player.y, { count: 30, color: PALETTE.playerRobe, speed: 200, life: 0.8, size: 4 });
      audio.stopMusic();
      audio.play('gameover');
    }
  }

  function killEnemy(enemy) {
    state.kills += 1;
    state.score += enemy.score;
    state.streak += 1;
    state.streakAt = state.time;
    particles.burst(enemy.x, enemy.y, { count: enemy.kind === 'herald' ? 80 : 14, color: enemy.color, speed: 240, life: 0.55, size: 3 });
    audio.play('kill');
    // Starlight motes carry the foe's experience.
    let remaining = enemy.xp;
    while (remaining > 0) {
      const value = Math.min(5, remaining);
      remaining -= value;
      const angle = state.rng.range(0, Math.PI * 2);
      const dist = state.rng.range(4, 26);
      state.motes.push({
        x: enemy.x + Math.cos(angle) * dist,
        y: enemy.y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        value,
        phase: state.rng.range(0, Math.PI * 2),
        age: 0,
      });
    }
    if (enemy.kind === 'herald') {
      onBossDefeated(state.director);
      state.boss = null;
      hud.hideBoss();
      state.score += 500;
      state.pendingEnd = 'victory';
      state.endTimer = 1.2;
      particles.ring(enemy.x, enemy.y, { count: 48, color: PALETTE.lanternHot, speed: 420, life: 0.8, size: 4 });
      audio.play('victory');
    }
  }

  function finishRun(kind) {
    state.mode = kind;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
    audio.stopMusic();
    if (kind === 'gameover') {
      screens.showGameOver(state);
    } else {
      const stars = 1 + (state.score >= 6000 ? 1 : 0) + (state.player.hp >= 50 ? 1 : 0);
      screens.showVictory(state, stars);
    }
  }

  function spawnAt(kind, x, y) {
    const enemy = spawnEnemy(kind, x, y, Math.max(1, state.director.wave), state.rng);
    state.enemies.push(enemy);
    particles.burst(x, y, { count: 8, color: enemy.color, speed: 90, life: 0.4, size: 2 });
    return enemy;
  }

  function spawnBoss() {
    const b = state.bounds;
    const boss = spawnAt('herald', (b.left + b.right) / 2, b.top + 90);
    state.boss = boss;
    hud.showBoss('The Night Herald');
    audio.play('boss');
    state.shake = Math.min(16, state.shake + 10);
  }

  const directorApi = {
    get rng() { return state.rng; },
    get bounds() { return state.bounds; },
    enemyCount: () => state.enemies.length,
    spawn: (kind, x, y) => spawnAt(kind, x, y),
    spawnBoss,
    banner: (title, sub) => hud.banner(title, sub),
    onWaveStart: () => audio.play('wave'),
    onWaveCleared: (wave) => {
      state.score += wave * 100;
      healPlayer(state.player, 10);
      hud.banner(`Wave ${wave} cleared`, `+${wave * 100} score · the lantern steadies you (+10 health)`);
      audio.play('wave');
    },
  };

  const enemyEvents = {
    onSpit(x, y, angle) {
      spawnGlob(state.arsenal, x, y, angle, 6);
      audio.play('spit');
    },
    onBurst(x, y, count, speed, offset) {
      for (let i = 0; i < count; i += 1) {
        const angle = offset + (i / count) * Math.PI * 2;
        spawnGlob(state.arsenal, x, y, angle, 10);
      }
      audio.play('spit');
    },
    onSummon(kind) {
      if (!state.boss) return;
      const angle = state.rng.range(0, Math.PI * 2);
      spawnAt(kind, state.boss.x + Math.cos(angle) * 90, state.boss.y + Math.sin(angle) * 90);
    },
    onBlink(x, y) {
      particles.burst(x, y, { count: 10, color: PALETTE.wraith, speed: 120, life: 0.35, size: 2 });
    },
    onEnrage(x, y) {
      hud.banner('The Herald rages', 'Its bursts quicken. End it now.');
      particles.ring(x, y, { count: 30, color: PALETTE.herald, speed: 300, life: 0.5, size: 3 });
      audio.play('boss');
    },
  };

  function step(dt) {
    // Edge-triggered actions.
    if (input.pressed('KeyM')) {
      const muted = audio.toggleMuted();
      screens.setMuteLabel(muted);
    }
    if (state.mode === 'playing') {
      if (input.pressed('Escape') || input.pressed('KeyP')) pause();
      if (input.pressed('Space') || input.pressed('ShiftLeft') || input.pressed('ShiftRight')) {
        if (tryDash(state.player, input, audio)) {
          particles.burst(state.player.x, state.player.y, { count: 10, color: PALETTE.lantern, speed: 140, life: 0.3, size: 2 });
        }
      }
      for (const click of input.drainClicks()) {
        if (castNova(state)) break;
      }
    } else if (state.mode === 'paused') {
      if (input.pressed('Escape') || input.pressed('KeyP') || input.pressed('Enter')) resume();
    } else if (state.mode === 'levelup') {
      if (input.pressed('Digit1')) pickBoon(0);
      else if (input.pressed('Digit2')) pickBoon(1);
      else if (input.pressed('Digit3')) pickBoon(2);
    } else if (state.mode === 'title') {
      if (input.pressed('Enter')) start();
    } else if (state.mode === 'gameover' || state.mode === 'victory') {
      if (input.pressed('Enter')) start();
    }
    if (state.mode !== 'playing') input.drainClicks();
    input.endStep();

    if (state.mode !== 'playing') return;

    state.time = Math.min(CONFIG.maxClockSeconds, state.time + dt);
    state.shake *= Math.exp(-6 * dt);
    if (state.shake < 0.2) state.shake = 0;

    updatePlayer(state.player, input, dt, state.bounds);
    updateWeapons(state, dt);

    for (const enemy of state.enemies) {
      updateEnemy(enemy, state.player, dt, enemyEvents, state.rng);
      // Keep foes inside the walls.
      enemy.x = Math.max(state.bounds.left + enemy.radius, Math.min(state.bounds.right - enemy.radius, enemy.x));
      enemy.y = Math.max(state.bounds.top + enemy.radius, Math.min(state.bounds.bottom - enemy.radius, enemy.y));
    }
    separateEnemies(state.enemies, dt);

    // Contact damage.
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.touchCooldown > 0 || state.player.dead) continue;
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < enemy.radius + state.player.radius - 2) {
        enemy.touchCooldown = 0.6;
        enemy.knockX -= (dx / (dist || 1)) * 160;
        enemy.knockY -= (dy / (dist || 1)) * 160;
        hitPlayer(enemy.damage, state.player.x, state.player.y, enemy);
      }
    }

    // Remove the slain.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].hp <= 0) state.enemies.splice(i, 1);
    }

    // Starlight motes drift, magnetise and collect.
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const mote = state.motes[i];
      mote.age += dt;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.vx *= Math.pow(0.01, dt);
      mote.vy *= Math.pow(0.01, dt);
      const dx = state.player.x - mote.x;
      const dy = state.player.y - mote.y;
      const dist = Math.hypot(dx, dy);
      if (dist < state.player.magnetRadius) {
        const pull = 620 * (1 - dist / (state.player.magnetRadius + 1)) + 180;
        mote.vx += (dx / (dist || 1)) * pull * dt * 4;
        mote.vy += (dy / (dist || 1)) * pull * dt * 4;
      }
      if (dist < state.player.collectRadius + 6) {
        state.motes.splice(i, 1);
        particles.burst(mote.x, mote.y, { count: 5, color: PALETTE.mote, speed: 110, life: 0.3, size: 2 });
        audio.play('pickup', state.time);
        gainXp(mote.value);
        if (state.mode !== 'playing') return; // level-up opened mid-step
      }
    }

    particles.update(dt);
    updateDirector(state.director, dt, directorApi);

    if (state.boss) hud.setBossHp(state.boss.hp / state.boss.maxHp);

    // Combo streaks fade on their own; the HUD hides them.
    if (state.time - state.streakAt > 4) state.streak = 0;

    // Delayed end-of-run transitions (death and victory cinematics).
    if (state.pendingEnd) {
      state.endTimer -= dt;
      if (state.endTimer <= 0) {
        const kind = state.pendingEnd;
        state.pendingEnd = null;
        finishRun(kind);
      }
    }
  }

  // Systems that run through the shared state object reach the run's
  // kill/hit handlers through the state itself.
  state.killEnemy = killEnemy;
  state.hitPlayer = hitPlayer;

  let accumulator = 0;
  let lastNow = 0;
  let rafId = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const nowSeconds = now / 1000;
    if (lastNow === 0) lastNow = nowSeconds;
    let dt = Math.min(0.1, nowSeconds - lastNow);
    lastNow = nowSeconds;
    state.renderTime += dt;
    accumulator += dt;
    while (accumulator >= CONFIG.step) {
      step(CONFIG.step);
      accumulator -= CONFIG.step;
    }
    renderer.draw(state);
    if (state.mode === 'playing' || state.mode === 'levelup' || state.mode === 'paused') {
      hud.update(state);
    }
  }

  return {
    state,
    start,
    quitToTitle,
    pause,
    resume,
    pickBoon,
    step,
    refreshBounds,
    hitPlayer,
    killEnemy,
    // Deterministic hooks for screenshot scenes and headless tests. Normal
    // play never calls these; they only ever arrange real game state.
    debug: {
      spawnAt,
      spawnBoss,
      gainXp,
      forceEnd(kind) {
        state.pendingEnd = kind;
        state.endTimer = 0.05;
      },
    },
    run() {
      refreshBounds();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
}
