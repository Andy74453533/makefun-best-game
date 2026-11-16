[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Andy74453533/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Andy74453533/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# Lanternfall — Keeper of the Last Light

An original 2D arena-survival action game, built from scratch for the
[make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01). No
libraries, no external assets, no network requests: procedural canvas art,
synthesized WebAudio sound, and plain ES modules.

## The game

The gloom has swallowed the valley, and every light but one has gone out. You
are the keeper of the last lantern, defending a floating stone courtyard
through ten waves of night — ending with the Night Herald, a two-phase boss
that fires radial bursts and summons its own minions. Slain foes drop starlight
motes; gather them to level up and choose from fourteen boons that reshape your
build: splitting bolts, piercing rays, orbital lanterns, faster dashes, thorns,
regeneration, and more. Win by felling the Herald before the night ends; lose
if your light goes out.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move the keeper |
| Mouse | Aim — lantern bolts fire on their own |
| Left click | Nova burst (damage + knockback, cooldown) |
| Space / Shift | Dash (briefly untouchable, charges + cooldown) |
| 1 / 2 / 3 or click | Pick a boon when you level up |
| P / Esc | Pause |
| M | Mute |
| Enter | Start / restart |

## Run it

Serve the `game/` folder from any static file server and open `index.html` in
a desktop browser, for example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080. Everything runs offline once loaded.

## Layout

```
main.ts                 entrypoint: copies game/ + screenshots/ to /output,
                        writes dossier.json with the vendored make.fun library
vendor/makefun-game.ts  make.fun's dossier library, unchanged from the kit
game/
  index.html            page shell: canvas, HUD, title/pause/level-up/end screens
  styles.css            all UI styling
  src/
    main.js             boot, resize, focus handling, ?shot= scenes
    game.js             state machine, fixed-step simulation, scoring, win/lose
    config.js           tuning: player, enemies, waves, palette
    rng.js              seeded random number generator
    input.js            keyboard + mouse, edge-triggered presses
    audio.js            synthesized WebAudio sound effects and music
    particles.js        bursts, rings, floating text
    player.js           the keeper: movement, dash, damage, healing
    enemies.js          six foe kinds, boss phases, separation
    weapons.js          bolts, orbitals, nova, enemy globs
    boons.js            fourteen level-up boons and the roll logic
    waves.js            the wave director: breathers, budgets, boss entrance
    render.js           all canvas art: sky, courtyard, keeper, gloom, glows
    hud.js              DOM heads-up display: health, wave, score, cooldowns
    screens.js          DOM overlays: title, pause, level-up, game over, victory
    shots.js            deterministic screenshot scenes (?shot=&seed=)
screenshots/            real renders of the game's own code
```

## Screenshots

`1-play.jpg` — mid-combat with the HUD. `2-title.jpg` — the title screen.
`3-boon.jpg` — choosing a level-up boon. `4-victory.jpg` — the victory screen
with restart.

## License

MIT — see [LICENSE](LICENSE).
