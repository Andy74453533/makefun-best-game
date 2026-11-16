// The gloom: five foe kinds plus the Night Herald. Each kind has its own
// movement behaviour; the boss adds phases, radial bursts and summons.

import { ENEMIES, waveScaling } from './config.js';

let nextId = 1;

export function spawnEnemy(kind, x, y, wave, rng) {
  const def = ENEMIES[kind];
  const scale = waveScaling(wave);
  const hp = Math.round(def.hp * scale.hpMul);
  const enemy = {
    id: nextId,
    kind,
    x, y,
    hp, maxHp: hp,
    speed: def.speed * scale.speedMul * rng.range(0.92, 1.08),
    damage: Math.round(def.damage * scale.damageMul),
    radius: def.radius,
    xp: def.xp,
    score: def.score,
    color: def.color,
    behaviour: def.behaviour,
    hitFlash: 0,
    touchCooldown: 0,
    wobble: rng.range(0, Math.PI * 2),
    wobbleSpeed: rng.range(2, 4),
    // Behaviour timers.
    spitCooldown: rng.range(1.2, 2.4),
    blinkCooldown: rng.range(2.2, 3.2),
    blinkFade: 0,
    spawnAge: 0,
    knockX: 0,
    knockY: 0,
    orbCooldown: 0,
    // Boss fields, used only by the herald.
    phase: 1,
    burstCooldown: 2.6,
    summonCooldown: 5,
    enraged: false,
  };
  nextId += 1;
  return enemy;
}

// Steer one enemy for a step. `events` carries callbacks the game provides:
// onSpit(x, y, angle), onBurst(x, y, count, speed, offset), onSummon(kind).
export function updateEnemy(enemy, player, dt, events, rng) {
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
  enemy.orbCooldown = Math.max(0, enemy.orbCooldown - dt);
  enemy.spawnAge += dt;
  enemy.wobble += enemy.wobbleSpeed * dt;

  // Knockback decays and applies on top of steering.
  enemy.x += enemy.knockX * dt;
  enemy.y += enemy.knockY * dt;
  enemy.knockX *= Math.pow(0.001, dt);
  enemy.knockY *= Math.pow(0.001, dt);

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  switch (enemy.behaviour) {
    case 'zigzag': {
      const side = Math.sin(enemy.wobble * 2.2) * 0.85;
      const px = -ny * side;
      const py = nx * side;
      enemy.x += (nx + px) * enemy.speed * dt;
      enemy.y += (ny + py) * enemy.speed * dt;
      break;
    }
    case 'skirmish': {
      // Hold a ring around the keeper and spit globs from range.
      const want = 300;
      const toward = dist > want + 30 ? 1 : dist < want - 30 ? -0.7 : 0;
      const strafe = Math.sin(enemy.wobble * 0.9) > 0 ? 1 : -1;
      enemy.x += (nx * toward + -ny * strafe * 0.6) * enemy.speed * dt;
      enemy.y += (ny * toward + nx * strafe * 0.6) * enemy.speed * dt;
      enemy.spitCooldown -= dt;
      if (enemy.spitCooldown <= 0 && dist < 560) {
        enemy.spitCooldown = 2.4;
        events.onSpit(enemy.x, enemy.y, Math.atan2(dy, dx));
      }
      break;
    }
    case 'blink': {
      enemy.blinkCooldown -= dt;
      if (enemy.blinkCooldown <= 0 && dist > 120) {
        enemy.blinkCooldown = 3.1;
        enemy.blinkFade = 0.3;
        const jump = Math.min(170, dist - 60);
        enemy.x += nx * jump;
        enemy.y += ny * jump;
        events.onBlink(enemy.x, enemy.y);
      } else {
        enemy.x += nx * enemy.speed * dt;
        enemy.y += ny * enemy.speed * dt;
      }
      enemy.blinkFade = Math.max(0, enemy.blinkFade - dt);
      break;
    }
    case 'boss': {
      updateBoss(enemy, player, dt, events, nx, ny, dist);
      break;
    }
    default: { // chase
      const sway = Math.sin(enemy.wobble) * 0.22;
      enemy.x += (nx + -ny * sway) * enemy.speed * dt;
      enemy.y += (ny + nx * sway) * enemy.speed * dt;
      break;
    }
  }
}

function updateBoss(boss, player, dt, events, nx, ny, dist) {
  if (!boss.enraged && boss.hp <= boss.maxHp * 0.5) {
    boss.enraged = true;
    boss.phase = 2;
    boss.speed *= 1.35;
    events.onEnrage(boss.x, boss.y);
  }
  // Slow advance, never quite stopping on top of the keeper.
  if (dist > boss.radius + player.radius + 6) {
    boss.x += nx * boss.speed * dt;
    boss.y += ny * boss.speed * dt;
  }
  boss.burstCooldown -= dt;
  if (boss.burstCooldown <= 0) {
    boss.burstCooldown = boss.enraged ? 2.1 : 2.9;
    const count = boss.enraged ? 18 : 12;
    events.onBurst(boss.x, boss.y, count, boss.enraged ? 210 : 170, boss.wobble);
  }
  boss.summonCooldown -= dt;
  if (boss.summonCooldown <= 0) {
    boss.summonCooldown = boss.enraged ? 5 : 6.5;
    events.onSummon('wisp');
    events.onSummon('wisp');
    if (boss.enraged) events.onSummon('skitter');
  }
}

// Gentle separation so foes do not stack into one blob.
export function separateEnemies(enemies, dt) {
  for (let i = 0; i < enemies.length; i += 1) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j += 1) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.radius + b.radius - 2;
      if (dist > 0.001 && dist < min) {
        const push = ((min - dist) / dist) * 0.5 * Math.min(1, dt * 60);
        const px = dx * push * 0.5;
        const py = dy * push * 0.5;
        if (a.behaviour !== 'boss') {
          a.x -= px;
          a.y -= py;
        }
        if (b.behaviour !== 'boss') {
          b.x += px;
          b.y += py;
        }
      }
    }
  }
}
