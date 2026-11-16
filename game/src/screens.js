// The full-screen overlays: title, pause, level-up choices, game over and
// victory. Each screen is plain DOM so it stays crisp in screenshots.

export function bindScreens(handlers) {
  const el = (id) => document.getElementById(id);
  const screens = {
    title: el('screen-title'),
    pause: el('screen-pause'),
    levelup: el('screen-levelup'),
    gameover: el('screen-gameover'),
    victory: el('screen-victory'),
  };
  const bestLine = el('best-line');
  const boonCards = el('boon-cards');
  const finalStats = el('final-stats');
  const victoryStats = el('victory-stats');
  const victoryStars = el('victory-stars');
  const muteButton = el('mute-button');

  el('start-button').addEventListener('click', () => handlers.onStart());
  el('resume-button').addEventListener('click', () => handlers.onResume());
  el('restart-button').addEventListener('click', () => handlers.onRestart());
  el('again-button').addEventListener('click', () => handlers.onRestart());
  muteButton.addEventListener('click', () => handlers.onMute());
  el('pause-quit-button').addEventListener('click', () => handlers.onQuitToTitle());

  function hideAll() {
    for (const screen of Object.values(screens)) screen.classList.add('hidden');
  }

  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function statsHtml(state) {
    return [
      ['Score', state.score.toLocaleString('en-US')],
      ['Foes felled', state.kills],
      ['Wave reached', Math.max(1, state.director.wave)],
      ['Level', state.level],
      ['Time', formatClock(state.time)],
      ['Best score', state.best.toLocaleString('en-US')],
    ].map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  return {
    hideAll,
    showTitle(best) {
      hideAll();
      bestLine.textContent = best > 0
        ? `Best score: ${best.toLocaleString('en-US')}`
        : 'No runs yet — the courtyard waits.';
      screens.title.classList.remove('hidden');
    },
    showPause() {
      hideAll();
      screens.pause.classList.remove('hidden');
    },
    showLevelUp(cards, stacks, onPick) {
      hideAll();
      boonCards.innerHTML = '';
      cards.forEach((boon, index) => {
        const owned = stacks[boon.id] || 0;
        const button = document.createElement('button');
        button.className = 'boon-card';
        button.innerHTML = `
          <span class="boon-glyph">${boon.glyph}</span>
          <span class="boon-name">${boon.name}</span>
          <span class="boon-desc">${boon.desc}</span>
          <span class="boon-meta">${owned > 0 ? `Owned ×${owned}` : 'New'} · press ${index + 1}</span>`;
        button.addEventListener('click', () => onPick(index));
        button.addEventListener('mouseenter', () => button.focus());
        boonCards.appendChild(button);
      });
      screens.levelup.classList.remove('hidden');
    },
    showGameOver(state) {
      hideAll();
      finalStats.innerHTML = statsHtml(state);
      screens.gameover.classList.remove('hidden');
    },
    showVictory(state, stars) {
      hideAll();
      victoryStats.innerHTML = statsHtml(state);
      victoryStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      screens.victory.classList.remove('hidden');
    },
    setMuteLabel(muted) {
      muteButton.textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
    },
  };
}
