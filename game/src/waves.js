// The wave director: breathers, spawn budgets, the boss entrance, and the
// pacing that makes each wave feel busier than the last.

import { WAVES, WAVE_BREATHER_SECONDS, BOSS_BREATHER_SECONDS } from './config.js';

export function createDirector() {
  return {
    wave: 0,
    phase: 'breather', // 'breather' | 'active' | 'done'
    timer: 2.5,
    spawnTimer: 0,
    remaining: 0,
    bossSpawned: false,
    bossAlive: false,
  };
}

// `api` is what the director needs from the game: spawn(kind, x, y),
// spawnBoss(), banner(text, sub), rng, bounds, and the live enemy count.
export function updateDirector(director, dt, api) {
  if (director.phase === 'done') return;

  if (director.phase === 'breather') {
    director.timer -= dt;
    if (director.timer <= 0) {
      director.wave += 1;
      const def = WAVES[director.wave - 1];
      director.phase = 'active';
      director.timer = def.seconds;
      director.remaining = def.budget;
      director.spawnTimer = 0.4;
      if (def.boss) {
        api.banner(`Wave ${director.wave}`, 'The Night Herald approaches…');
        api.spawnBoss();
        director.bossSpawned = true;
        director.bossAlive = true;
      } else {
        api.banner(`Wave ${director.wave}`, waveSubtitle(director.wave));
        api.onWaveStart(director.wave);
      }
    }
    return;
  }

  // Active wave: spend the budget on a steady drip, then wait for the field
  // to clear before the next breather.
  const def = WAVES[director.wave - 1];
  director.timer -= dt;
  director.spawnTimer -= dt;
  if (director.remaining > 0 && director.spawnTimer <= 0) {
    director.spawnTimer = 1 / def.rate;
    director.remaining -= 1;
    const kind = api.rng.weighted(def.kinds);
    const edge = pickEdgeSpawn(api.rng, api.bounds);
    api.spawn(kind, edge.x, edge.y);
  }

  if (def.boss) {
    // Boss wave: a slow trickle of adds while the Herald lives.
    if (director.bossAlive && director.spawnTimer <= -1.2) {
      director.spawnTimer = 0;
      const kind = api.rng.weighted(def.kinds);
      const edge = pickEdgeSpawn(api.rng, api.bounds);
      api.spawn(kind, edge.x, edge.y);
    }
    return;
  }

  const cleared = director.remaining <= 0 && api.enemyCount() === 0;
  const timedOut = director.timer <= 0 && director.remaining <= 0;
  if (cleared || timedOut) {
    api.onWaveCleared(director.wave);
    if (director.wave >= WAVES.length) {
      director.phase = 'done';
    } else {
      director.phase = 'breather';
      const next = WAVES[director.wave];
      director.timer = next && next.boss ? BOSS_BREATHER_SECONDS : WAVE_BREATHER_SECONDS;
    }
  }
}

export function onBossDefeated(director) {
  director.bossAlive = false;
  director.phase = 'done';
}

function waveSubtitle(wave) {
  const lines = [
    'The gloom stirs at the edges.',
    'They come faster now.',
    'Something heavy walks the dark.',
    'Spitters gather beyond the wall.',
    'The wraiths have found you.',
    'Hold the light. Hold the line.',
    'The night deepens.',
    'No dawn comes early tonight.',
    'One more wave. Then the Herald.',
    '',
  ];
  return lines[wave - 1] || '';
}

function pickEdgeSpawn(rng, bounds) {
  const side = rng.int(0, 3);
  const inset = 8;
  if (side === 0) return { x: rng.range(bounds.left, bounds.right), y: bounds.top + inset };
  if (side === 1) return { x: rng.range(bounds.left, bounds.right), y: bounds.bottom - inset };
  if (side === 2) return { x: bounds.left + inset, y: rng.range(bounds.top, bounds.bottom) };
  return { x: bounds.right - inset, y: rng.range(bounds.top, bounds.bottom) };
}
