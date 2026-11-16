// LANTERNFALL tuning: every number that shapes how the game feels lives here,
// so balance can be adjusted without touching the systems that use it.

export const CONFIG = {
  // The arena is the whole window; walls sit this far inside the edges.
  wallMargin: 30,
  // Fixed simulation step, decoupled from rendering.
  step: 1 / 60,
  // How long a run may show on the clock before it stops counting up.
  maxClockSeconds: 3599,
};

export const PALETTE = {
  skyTop: '#0b1026',
  skyBottom: '#1a1440',
  moon: '#f5e9c8',
  moonGlow: 'rgba(245, 233, 200, 0.25)',
  floor: '#232047',
  floorLine: '#2e2a5c',
  rune: '#ffb84d',
  wall: '#12102b',
  lantern: '#ffc966',
  lanternHot: '#fff3d0',
  mote: '#7df9e8',
  bolt: '#ffe9a8',
  nova: '#ffd98a',
  playerRobe: '#3b6ea5',
  playerTrim: '#ffd98a',
  wisp: '#8f7bff',
  skitter: '#ff7bd5',
  husk: '#6fbf6a',
  spitter: '#ffb04d',
  wraith: '#b8c7ff',
  herald: '#c65bff',
  glob: '#d8ff5b',
  danger: '#ff5b6a',
  text: '#f2ead8',
};

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.32,
  boltDamage: 12,
  boltSpeed: 760,
  boltRange: 620,
  magnetRadius: 90,
  collectRadius: 26,
  dashSpeed: 880,
  dashTime: 0.16,
  dashCooldown: 2.1,
  dashCharges: 1,
  novaDamage: 46,
  novaRadius: 250,
  novaCooldown: 6,
  novaKnockback: 420,
  critChance: 0.05,
  critMultiplier: 2,
  regenPerSecond: 0,
  thorns: 0,
  xpGain: 1,
  contactGraceSeconds: 0.6,
};

// Enemy kinds. hp/speed/damage scale slightly with the wave that spawns them.
export const ENEMIES = {
  wisp: {
    hp: 18, speed: 96, damage: 8, radius: 13, xp: 1, score: 10,
    color: PALETTE.wisp, behaviour: 'chase',
  },
  skitter: {
    hp: 12, speed: 178, damage: 6, radius: 10, xp: 1, score: 15,
    color: PALETTE.skitter, behaviour: 'zigzag',
  },
  husk: {
    hp: 96, speed: 56, damage: 16, radius: 22, xp: 3, score: 30,
    color: PALETTE.husk, behaviour: 'chase',
  },
  spitter: {
    hp: 28, speed: 82, damage: 6, radius: 14, xp: 2, score: 25,
    color: PALETTE.spitter, behaviour: 'skirmish',
  },
  wraith: {
    hp: 42, speed: 122, damage: 12, radius: 14, xp: 4, score: 40,
    color: PALETTE.wraith, behaviour: 'blink',
  },
  herald: {
    hp: 2600, speed: 64, damage: 22, radius: 44, xp: 40, score: 1500,
    color: PALETTE.herald, behaviour: 'boss',
  },
};

// One entry per wave. `spawns` is the total spawn budget; `rate` caps how fast
// the director may spend it. Wave 10 is the boss: adds trickle while it lives.
export const WAVES = [
  { seconds: 32, budget: 14, rate: 0.7, kinds: [['wisp', 1]] },
  { seconds: 34, budget: 22, rate: 0.9, kinds: [['wisp', 3], ['skitter', 1]] },
  { seconds: 36, budget: 30, rate: 1.1, kinds: [['wisp', 3], ['skitter', 2], ['husk', 1]] },
  { seconds: 38, budget: 40, rate: 1.3, kinds: [['wisp', 3], ['skitter', 2], ['husk', 1], ['spitter', 1]] },
  { seconds: 40, budget: 50, rate: 1.5, kinds: [['wisp', 2], ['skitter', 2], ['husk', 1], ['spitter', 1], ['wraith', 1]] },
  { seconds: 42, budget: 62, rate: 1.7, kinds: [['wisp', 2], ['skitter', 3], ['husk', 2], ['spitter', 1], ['wraith', 1]] },
  { seconds: 44, budget: 74, rate: 1.9, kinds: [['skitter', 3], ['husk', 2], ['spitter', 2], ['wraith', 2], ['wisp', 1]] },
  { seconds: 46, budget: 88, rate: 2.1, kinds: [['skitter', 3], ['husk', 3], ['spitter', 2], ['wraith', 2]] },
  { seconds: 48, budget: 104, rate: 2.4, kinds: [['skitter', 3], ['husk', 3], ['spitter', 3], ['wraith', 3], ['wisp', 1]] },
  { seconds: 999, budget: 0, rate: 0.5, kinds: [['wisp', 2], ['skitter', 1]], boss: true },
];

export const WAVE_BREATHER_SECONDS = 5;
export const BOSS_BREATHER_SECONDS = 8;

// XP needed to go from level n to n+1.
export function xpForLevel(level) {
  return 8 + level * 4;
}

// Enemy stat growth per wave, gentle so early waves stay fair.
export function waveScaling(wave) {
  return {
    hpMul: 1 + (wave - 1) * 0.09,
    speedMul: 1 + Math.min(0.25, (wave - 1) * 0.02),
    damageMul: 1 + (wave - 1) * 0.03,
  };
}
