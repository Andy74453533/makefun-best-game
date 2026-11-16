// The DOM heads-up display: health, starlight, wave, score, cooldowns and
// the boss bar. The canvas never draws text the player must read at a glance.

export function bindHud() {
  const el = (id) => document.getElementById(id);
  const hud = {
    root: el('hud'),
    hpFill: el('hp-fill'),
    hpText: el('hp-text'),
    levelBadge: el('level-badge'),
    xpFill: el('xp-fill'),
    waveLabel: el('wave-label'),
    scoreLabel: el('score-label'),
    killsLabel: el('kills-label'),
    clockLabel: el('clock-label'),
    dashPip: el('dash-pip'),
    dashText: el('dash-text'),
    novaPip: el('nova-pip'),
    novaText: el('nova-text'),
    bossBar: el('boss-bar'),
    bossFill: el('boss-fill'),
    bossName: el('boss-name'),
    banner: el('banner'),
    bannerTitle: el('banner-title'),
    bannerSub: el('banner-sub'),
    combo: el('combo'),
  };
  let bannerTimer = 0;

  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return {
    show() {
      hud.root.classList.remove('hidden');
    },
    hide() {
      hud.root.classList.add('hidden');
    },
    update(state) {
      const p = state.player;
      const hpFrac = Math.max(0, p.hp / p.maxHp);
      hud.hpFill.style.width = `${hpFrac * 100}%`;
      hud.hpFill.classList.toggle('low', hpFrac < 0.3);
      hud.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
      hud.levelBadge.textContent = `Lv ${state.level}`;
      hud.xpFill.style.width = `${Math.min(100, (state.xp / state.xpNext) * 100)}%`;
      hud.waveLabel.textContent = state.director.wave > 0
        ? `Wave ${state.director.wave} / 10`
        : 'The night begins';
      hud.scoreLabel.textContent = state.score.toLocaleString('en-US');
      hud.killsLabel.textContent = `${state.kills} felled`;
      hud.clockLabel.textContent = formatClock(state.time);
      // Cooldown pips: filled when ready.
      const dashReady = p.dashCharges > 0;
      hud.dashPip.classList.toggle('ready', dashReady);
      hud.dashText.textContent = dashReady ? `Dash ×${p.dashCharges}` : 'Dash…';
      const novaReady = state.arsenal.novaCooldown <= 0;
      hud.novaPip.classList.toggle('ready', novaReady);
      hud.novaText.textContent = novaReady ? 'Nova ready' : `Nova ${state.arsenal.novaCooldown.toFixed(1)}s`;
      // Kill streak callout.
      if (state.streak >= 5 && state.time - state.streakAt < 2.5) {
        hud.combo.textContent = `${state.streak} in a row!`;
        hud.combo.classList.remove('hidden');
      } else {
        hud.combo.classList.add('hidden');
      }
    },
    banner(title, sub = '') {
      hud.bannerTitle.textContent = title;
      hud.bannerSub.textContent = sub;
      hud.banner.classList.remove('hidden');
      hud.banner.classList.remove('show');
      void hud.banner.offsetWidth; // restart the animation
      hud.banner.classList.add('show');
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => hud.banner.classList.add('hidden'), 2600);
    },
    showBoss(name) {
      hud.bossName.textContent = name;
      hud.bossBar.classList.remove('hidden');
    },
    setBossHp(frac) {
      hud.bossFill.style.width = `${Math.max(0, frac) * 100}%`;
    },
    hideBoss() {
      hud.bossBar.classList.add('hidden');
    },
  };
}
