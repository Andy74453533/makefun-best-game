// The keeper: movement, dash, facing and the stats boons modify. Damage and
// healing live here too; the game decides when they happen.

import { PLAYER } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y,
    radius: PLAYER.radius,
    // Base stats; boons multiply or add to these.
    speed: PLAYER.speed,
    maxHp: PLAYER.maxHp,
    hp: PLAYER.maxHp,
    fireInterval: PLAYER.fireInterval,
    boltDamage: PLAYER.boltDamage,
    boltSpeed: PLAYER.boltSpeed,
    boltRange: PLAYER.boltRange,
    boltCount: 1,
    pierce: 0,
    magnetRadius: PLAYER.magnetRadius,
    collectRadius: PLAYER.collectRadius,
    dashCooldownMax: PLAYER.dashCooldown,
    dashChargesMax: PLAYER.dashCharges,
    novaDamage: PLAYER.novaDamage,
    novaRadius: PLAYER.novaRadius,
    novaCooldownMax: PLAYER.novaCooldown,
    critChance: PLAYER.critChance,
    critMultiplier: PLAYER.critMultiplier,
    regenPerSecond: PLAYER.regenPerSecond,
    thorns: PLAYER.thorns,
    xpGain: PLAYER.xpGain,
    orbitals: 0,
    // Runtime state.
    faceAngle: -Math.PI / 2,
    walkPhase: 0,
    moving: false,
    dashTime: 0,
    dashCooldown: 0,
    dashCharges: PLAYER.dashCharges,
    dashAngle: 0,
    invulnerable: 0,
    hurtFlash: 0,
    dead: false,
  };
}

export function updatePlayer(player, input, dt, bounds) {
  if (player.dead) return;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.dashCooldown <= 0 && player.dashCharges < player.dashChargesMax) {
    player.dashCharges += 1;
    player.dashCooldown = player.dashCharges < player.dashChargesMax ? player.dashCooldownMax : 0;
  }
  if (player.regenPerSecond > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + player.regenPerSecond * dt);
  }

  const axis = input.axis();
  player.moving = axis.x !== 0 || axis.y !== 0;

  // Dash: a short burst along the current move direction (or facing).
  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.x += Math.cos(player.dashAngle) * PLAYER.dashSpeed * dt;
    player.y += Math.sin(player.dashAngle) * PLAYER.dashSpeed * dt;
  } else {
    player.x += axis.x * player.speed * dt;
    player.y += axis.y * player.speed * dt;
  }

  player.x = Math.max(bounds.left + player.radius, Math.min(bounds.right - player.radius, player.x));
  player.y = Math.max(bounds.top + player.radius, Math.min(bounds.bottom - player.radius, player.y));

  if (player.moving) player.walkPhase += dt * 11;
  player.faceAngle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);
}

export function tryDash(player, input, audio) {
  if (player.dead || player.dashTime > 0 || player.dashCharges <= 0) return false;
  const axis = input.axis();
  let angle = player.faceAngle;
  if (axis.x !== 0 || axis.y !== 0) angle = Math.atan2(axis.y, axis.x);
  player.dashAngle = angle;
  player.dashTime = PLAYER.dashTime;
  player.dashCharges -= 1;
  if (player.dashCharges < player.dashChargesMax && player.dashCooldown <= 0) {
    player.dashCooldown = player.dashCooldownMax;
  }
  player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.05);
  if (audio) audio.play('dash');
  return true;
}

// Returns true when the hit killed the keeper.
export function damagePlayer(player, amount) {
  if (player.dead || player.invulnerable > 0) return false;
  player.hp -= amount;
  player.hurtFlash = 0.35;
  player.invulnerable = Math.max(player.invulnerable, 0.25);
  if (player.hp <= 0) {
    player.hp = 0;
    player.dead = true;
    return true;
  }
  return false;
}

export function healPlayer(player, amount) {
  if (player.dead) return;
  player.hp = Math.min(player.maxHp, player.hp + amount);
}
