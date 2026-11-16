// The keeper's arsenal: light bolts aimed with the mouse, orbital lanterns,
// the nova pulse, and the gloom's own globs flying back.

import { PALETTE } from './config.js';

export function createArsenal() {
  return {
    bolts: [],
    globs: [],
    fireTimer: 0,
    novaCooldown: 0,
    orbitAngle: 0,
  };
}

// Bolts fly toward the mouse. Multishot fans extra bolts around the aim line.
export function updateWeapons(state, dt) {
  const { player, arsenal, enemies, particles, audio, rng } = state;
  arsenal.fireTimer -= dt;
  arsenal.novaCooldown = Math.max(0, arsenal.novaCooldown - dt);
  arsenal.orbitAngle += dt * 2.6;

  if (arsenal.fireTimer <= 0 && enemies.length > 0 && !player.dead) {
    arsenal.fireTimer = player.fireInterval;
    const aim = Math.atan2(state.input.mouse.y - player.y, state.input.mouse.x - player.x);
    const count = player.boltCount;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 0.11;
      const angle = aim + offset;
      arsenal.bolts.push({
        x: player.x + Math.cos(angle) * 22,
        y: player.y + Math.sin(angle) * 22,
        vx: Math.cos(angle) * player.boltSpeed,
        vy: Math.sin(angle) * player.boltSpeed,
        travelled: 0,
        range: player.boltRange,
        pierceLeft: player.pierce,
        hitIds: new Set(),
      });
    }
    audio.play('shoot');
  }

  // Bolt flight and hits.
  for (let i = arsenal.bolts.length - 1; i >= 0; i -= 1) {
    const bolt = arsenal.bolts[i];
    const stepX = bolt.vx * dt;
    const stepY = bolt.vy * dt;
    bolt.x += stepX;
    bolt.y += stepY;
    bolt.travelled += Math.hypot(stepX, stepY);
    let spent = bolt.travelled >= bolt.range;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || bolt.hitIds.has(enemy.id)) continue;
      const dx = enemy.x - bolt.x;
      const dy = enemy.y - bolt.y;
      if (dx * dx + dy * dy < (enemy.radius + 5) * (enemy.radius + 5)) {
        bolt.hitIds.add(enemy.id);
        damageEnemy(state, enemy, player.boltDamage, rng, bolt.x, bolt.y);
        particles.burst(bolt.x, bolt.y, { count: 4, color: PALETTE.bolt, speed: 120, life: 0.3, size: 2 });
        if (bolt.pierceLeft > 0) {
          bolt.pierceLeft -= 1;
        } else {
          spent = true;
          break;
        }
      }
    }
    if (spent) arsenal.bolts.splice(i, 1);
  }

  // Orbital lanterns circle the keeper and burn what they touch.
  if (player.orbitals > 0) {
    for (let o = 0; o < player.orbitals; o += 1) {
      const angle = arsenal.orbitAngle + (o / player.orbitals) * Math.PI * 2;
      const ox = player.x + Math.cos(angle) * 64;
      const oy = player.y + Math.sin(angle) * 64;
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || enemy.orbCooldown > 0) continue;
        const dx = enemy.x - ox;
        const dy = enemy.y - oy;
        if (dx * dx + dy * dy < (enemy.radius + 14) * (enemy.radius + 14)) {
          enemy.orbCooldown = 0.45;
          damageEnemy(state, enemy, player.boltDamage * 0.8, rng, ox, oy);
        }
      }
    }
  }

  // Enemy globs arc toward the keeper.
  for (let i = arsenal.globs.length - 1; i >= 0; i -= 1) {
    const glob = arsenal.globs[i];
    glob.x += glob.vx * dt;
    glob.y += glob.vy * dt;
    glob.life -= dt;
    const dx = player.x - glob.x;
    const dy = player.y - glob.y;
    if (!player.dead && dx * dx + dy * dy < (player.radius + 7) * (player.radius + 7)) {
      state.hitPlayer(glob.damage, glob.x, glob.y);
      arsenal.globs.splice(i, 1);
      continue;
    }
    if (glob.life <= 0) arsenal.globs.splice(i, 1);
  }
}

export function damageEnemy(state, enemy, baseDamage, rng, hitX, hitY) {
  if (enemy.hp <= 0) return 0;
  const crit = rng.chance(state.player.critChance);
  const damage = Math.round(baseDamage * (crit ? state.player.critMultiplier : 1) * rng.range(0.9, 1.1));
  enemy.hp -= damage;
  enemy.hitFlash = 0.09;
  state.particles.floatText(hitX, hitY - enemy.radius, damage, crit ? '#ffd94d' : '#fff3d0', crit ? 20 : 14);
  if (enemy.hp <= 0) {
    state.killEnemy(enemy);
  } else {
    state.audio.play('hit');
  }
  return damage;
}

export function castNova(state) {
  const { player, arsenal, enemies, particles, audio } = state;
  if (arsenal.novaCooldown > 0 || player.dead) return false;
  arsenal.novaCooldown = player.novaCooldownMax;
  particles.ring(player.x, player.y, { count: 34, color: PALETTE.nova, speed: 460, life: 0.5, size: 4 });
  particles.burst(player.x, player.y, { count: 24, color: PALETTE.lanternHot, speed: 300, life: 0.5, size: 3 });
  audio.play('nova');
  state.shake = Math.min(14, state.shake + 7);
  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < player.novaRadius + enemy.radius) {
      const push = player.novaRadius > 0 ? (1 - dist / (player.novaRadius + enemy.radius)) : 0;
      enemy.knockX += (dx / (dist || 1)) * 420 * (0.4 + push);
      enemy.knockY += (dy / (dist || 1)) * 420 * (0.4 + push);
      damageEnemy(state, enemy, player.novaDamage, state.rng, enemy.x, enemy.y - enemy.radius);
    }
  }
  return true;
}

export function spawnGlob(arsenal, x, y, angle, damage) {
  const speed = 250;
  arsenal.globs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 3.2,
    damage,
  });
}
