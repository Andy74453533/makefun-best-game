// Level-up boons: the choices that shape a run. Each boon knows its own cap
// and how it changes the keeper; the game rolls three distinct ones per level.

export const BOONS = [
  {
    id: 'sharp', name: 'Sharper Light', glyph: '✦', max: 5,
    desc: 'Bolt damage +25%.',
    apply(player) { player.boltDamage *= 1.25; },
  },
  {
    id: 'rapid', name: 'Quick Wick', glyph: '≫', max: 5,
    desc: 'Fire rate +20%.',
    apply(player) { player.fireInterval *= 0.83; },
  },
  {
    id: 'swift', name: 'Night Stride', glyph: '➤', max: 4,
    desc: 'Move speed +12%.',
    apply(player) { player.speed *= 1.12; },
  },
  {
    id: 'vital', name: 'Sturdy Flame', glyph: '♥', max: 5,
    desc: '+25 max health, and heal 25.',
    apply(player) { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); },
  },
  {
    id: 'magnet', name: 'Star Magnet', glyph: '◎', max: 3,
    desc: 'Pickup radius +60%.',
    apply(player) { player.magnetRadius *= 1.6; },
  },
  {
    id: 'split', name: 'Twin Flames', glyph: '⑂', max: 3,
    desc: '+1 bolt per volley.',
    apply(player) { player.boltCount += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Ray', glyph: '⇶', max: 3,
    desc: 'Bolts pierce +1 foe.',
    apply(player) { player.pierce += 1; },
  },
  {
    id: 'orbit', name: 'Orbital Lantern', glyph: '☉', max: 3,
    desc: 'A lantern circles you, burning foes it touches.',
    apply(player) { player.orbitals += 1; },
  },
  {
    id: 'novapower', name: 'Bright Nova', glyph: '✺', max: 3,
    desc: 'Nova +60% damage, 1s faster recharge.',
    apply(player) {
      player.novaDamage *= 1.6;
      player.novaCooldownMax = Math.max(2.5, player.novaCooldownMax - 1);
    },
  },
  {
    id: 'dash', name: 'Ember Step', glyph: '↯', max: 2,
    desc: 'Dash recharges 25% faster, +1 charge.',
    apply(player) {
      player.dashCooldownMax *= 0.75;
      player.dashChargesMax += 1;
      player.dashCharges += 1;
    },
  },
  {
    id: 'crit', name: 'Lucky Spark', glyph: '♦', max: 4,
    desc: '+12% critical chance (crits deal double).',
    apply(player) { player.critChance += 0.12; },
  },
  {
    id: 'regen', name: 'Slow Burn', glyph: '♨', max: 3,
    desc: 'Regenerate +0.8 health per second.',
    apply(player) { player.regenPerSecond += 0.8; },
  },
  {
    id: 'greed', name: 'Star Hunger', glyph: '☆', max: 2,
    desc: '+30% starlight from motes.',
    apply(player) { player.xpGain *= 1.3; },
  },
  {
    id: 'thorns', name: 'Briar Light', glyph: '✜', max: 2,
    desc: 'Attackers take 10 damage when they hit you.',
    apply(player) { player.thorns += 10; },
  },
];

// The fallback when every boon is maxed out: score and healing, always useful.
export const CACHE_BOON = {
  id: 'cache', name: 'Starlight Cache', glyph: '⬡', max: 99,
  desc: '+250 score and heal 30 health.',
  apply(player, state) {
    state.score += 250;
    player.hp = Math.min(player.maxHp, player.hp + 30);
  },
};

export function rollBoons(rng, stacks, count = 3) {
  const available = BOONS.filter((boon) => (stacks[boon.id] || 0) < boon.max);
  const rolled = [];
  const pool = [...available];
  while (rolled.length < count && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    rolled.push(pool.splice(index, 1)[0]);
  }
  while (rolled.length < count) rolled.push(CACHE_BOON);
  return rolled;
}
