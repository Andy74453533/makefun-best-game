// Everything drawn on the canvas: the night sky, the courtyard, the keeper,
// the gloom, and every glow between them. All art is procedural.

import { PALETTE } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: Math.random(), y: Math.random() * 0.62,
      size: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.1,
    });
  }
  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    clouds.push({
      x: Math.random(), y: 0.04 + Math.random() * 0.2,
      width: 130 + Math.random() * 220, speed: 4 + Math.random() * 7,
    });
  }
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function draw(state) {
    const time = state.renderTime;
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSky(time);
    drawCourtyard(state, time);
    drawMotes(state, time);
    drawEnemies(state, time);
    drawPlayer(state, time);
    drawBolts(state);
    drawOrbitals(state);
    drawGlobs(state, time);
    state.particles.draw(ctx);
    drawDarkness(state, time);
    ctx.restore();
    drawVignette(state);
  }

  function drawSky(time) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Stars, twinkling gently.
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#e8ecff';
      ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    // The moon, high and watchful.
    const mx = width * 0.84;
    const my = height * 0.13;
    const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
    glow.addColorStop(0, PALETTE.moonGlow);
    glow.addColorStop(1, 'rgba(245, 233, 200, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mx, my, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(mx, my, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 170, 140, 0.5)';
    ctx.beginPath();
    ctx.arc(mx - 10, my - 6, 7, 0, Math.PI * 2);
    ctx.arc(mx + 12, my + 10, 5, 0, Math.PI * 2);
    ctx.arc(mx + 6, my - 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Drifting clouds, darker than the sky.
    ctx.fillStyle = 'rgba(16, 14, 44, 0.75)';
    for (const cloud of clouds) {
      const cx = ((cloud.x * width + time * cloud.speed) % (width + 320)) - 160;
      const cy = cloud.y * height;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cloud.width * 0.5, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - cloud.width * 0.25, cy + 7, cloud.width * 0.3, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cloud.width * 0.28, cy + 6, cloud.width * 0.28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Far floating islands, silhouettes with one lit window each.
    drawIsland(width * 0.12, height * 0.2, 120, time * 0.06);
    drawIsland(width * 0.55, height * 0.1, 84, time * 0.06 + 2);
    drawIsland(width * 0.3, height * 0.3, 60, time * 0.06 + 4);
  }

  function drawIsland(x, y, size, phase) {
    const bob = Math.sin(phase) * 5;
    ctx.fillStyle = '#0d0b24';
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y + bob);
    ctx.quadraticCurveTo(x, y + size * 0.42 + bob, x + size / 2, y + bob);
    ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.12 + bob, x, y - size * 0.1 + bob);
    ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.12 + bob, x - size / 2, y + bob);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x - 2, y - size * 0.06 + bob, 4, 5);
    ctx.globalAlpha = 1;
  }

  function drawCourtyard(state, time) {
    const b = state.bounds;
    // Stone floor.
    ctx.fillStyle = PALETTE.floor;
    ctx.beginPath();
    ctx.roundRect(b.left - 14, b.top - 14, b.right - b.left + 28, b.bottom - b.top + 28, 26);
    ctx.fill();
    // Tile seams.
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    const tile = 72;
    ctx.beginPath();
    for (let x = b.left; x <= b.right; x += tile) {
      ctx.moveTo(x, b.top);
      ctx.lineTo(x, b.bottom);
    }
    for (let y = b.top; y <= b.bottom; y += tile) {
      ctx.moveTo(b.left, y);
      ctx.lineTo(b.right, y);
    }
    ctx.stroke();
    // The great rune circle at the courtyard's heart.
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
    ctx.strokeStyle = `rgba(255, 184, 77, ${0.16 + pulse * 0.12})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 96, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + time * 0.08;
      const x1 = cx + Math.cos(a) * 96;
      const y1 = cy + Math.sin(a) * 96;
      const x2 = cx + Math.cos(a) * 120;
      const y2 = cy + Math.sin(a) * 120;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Corner braziers with living flames.
    drawBrazier(b.left + 26, b.top + 26, time);
    drawBrazier(b.right - 26, b.top + 26, time + 1.3);
    drawBrazier(b.left + 26, b.bottom - 26, time + 2.1);
    drawBrazier(b.right - 26, b.bottom - 26, time + 0.7);
    // The wall: a dark rim the gloom gathers beyond.
    ctx.strokeStyle = PALETTE.wall;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(b.left - 8, b.top - 8, b.right - b.left + 16, b.bottom - b.top + 16, 22);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(143, 123, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.left - 8, b.top - 8, b.right - b.left + 16, b.bottom - b.top + 16, 22);
    ctx.stroke();
  }

  function drawBrazier(x, y, time) {
    const flicker = 1 + Math.sin(time * 9) * 0.12 + Math.sin(time * 23) * 0.08;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 60 * flicker);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.5)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 60 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3358';
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 8);
    ctx.lineTo(x + 9, y + 8);
    ctx.lineTo(x + 5, y + 18);
    ctx.lineTo(x - 5, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 6 * flicker, 9 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 3 * flicker, 5 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMotes(state, time) {
    for (const mote of state.motes) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 5 + mote.phase);
      ctx.save();
      ctx.translate(mote.x, mote.y + Math.sin(time * 2 + mote.phase) * 2);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = PALETTE.mote;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.mote;
      ctx.globalAlpha = pulse;
      const s = 5 + mote.value;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawEnemies(state, time) {
    for (const enemy of state.enemies) {
      const spawnScale = Math.min(1, enemy.spawnAge / 0.35);
      const alpha = enemy.behaviour === 'blink' && enemy.blinkFade > 0
        ? 0.35 + 0.65 * (1 - enemy.blinkFade / 0.3)
        : 1;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(spawnScale, spawnScale);
      ctx.globalAlpha = alpha;
      if (enemy.spawnAge < 0.35) {
        ctx.strokeStyle = enemy.color;
        ctx.globalAlpha = (1 - enemy.spawnAge / 0.35) * 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 14 * (1 - enemy.spawnAge / 0.35), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 12;
      if (enemy.kind === 'wisp') drawWisp(enemy, time);
      else if (enemy.kind === 'skitter') drawSkitter(enemy, time);
      else if (enemy.kind === 'husk') drawHusk(enemy, time);
      else if (enemy.kind === 'spitter') drawSpitter(enemy, time);
      else if (enemy.kind === 'wraith') drawWraith(enemy, time);
      else if (enemy.kind === 'herald') drawHerald(enemy, time);
      ctx.shadowBlur = 0;
      if (enemy.hitFlash > 0) {
        ctx.globalAlpha = Math.min(1, enemy.hitFlash / 0.09) * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Small health bar for tougher foes.
      if (enemy.maxHp >= 40 && enemy.hp < enemy.maxHp && enemy.kind !== 'herald') {
        drawMiniBar(enemy.x, enemy.y - enemy.radius - 10, enemy.radius * 2, enemy.hp / enemy.maxHp);
      }
    }
  }

  function drawMiniBar(x, y, w, frac) {
    ctx.fillStyle = 'rgba(8, 6, 22, 0.8)';
    ctx.fillRect(x - w / 2, y, w, 4);
    ctx.fillStyle = frac > 0.4 ? '#9fe870' : '#ff5b6a';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 4);
  }

  function drawWisp(enemy, time) {
    const bob = Math.sin(time * 3 + enemy.wobble) * 2;
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, bob, enemy.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.55;
    ctx.beginPath();
    ctx.arc(-6, bob + 8, enemy.radius * 0.45, 0, Math.PI * 2);
    ctx.arc(5, bob + 10, enemy.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawEyes(0, bob - 2, 5, '#1a1030');
  }

  function drawSkitter(enemy, time) {
    const scuttle = Math.sin(time * 14 + enemy.wobble) * 3;
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 2;
    for (let leg = -1; leg <= 1; leg += 1) {
      ctx.beginPath();
      ctx.moveTo(leg * 6, 2);
      ctx.lineTo(leg * 11, 9 + (leg === 0 ? -scuttle : scuttle));
      ctx.stroke();
    }
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius);
    ctx.lineTo(-enemy.radius, 0);
    ctx.closePath();
    ctx.fill();
    drawEyes(0, -2, 4, '#1a1030');
  }

  function drawHusk(enemy) {
    ctx.fillStyle = '#2e4a2e';
    ctx.beginPath();
    ctx.roundRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2, 8);
    ctx.fill();
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-enemy.radius * 0.5, -enemy.radius * 0.4);
    ctx.lineTo(-enemy.radius * 0.1, 0);
    ctx.lineTo(-enemy.radius * 0.5, enemy.radius * 0.5);
    ctx.moveTo(enemy.radius * 0.5, -enemy.radius * 0.5);
    ctx.lineTo(enemy.radius * 0.2, enemy.radius * 0.1);
    ctx.stroke();
    drawEyes(0, -4, 7, enemy.color);
  }

  function drawSpitter(enemy, time) {
    const pulse = 1 + Math.sin(time * 4 + enemy.wobble) * 0.08;
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, -enemy.radius * 0.35, enemy.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(0, -enemy.radius * 0.35, 4, '#1a1030');
  }

  function drawWraith(enemy, time) {
    const sway = Math.sin(time * 2 + enemy.wobble) * 3;
    ctx.fillStyle = 'rgba(184, 199, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-enemy.radius, enemy.radius);
    ctx.quadraticCurveTo(-enemy.radius, -enemy.radius * 0.6, 0, -enemy.radius);
    ctx.quadraticCurveTo(enemy.radius, -enemy.radius * 0.6, enemy.radius, enemy.radius);
    ctx.lineTo(enemy.radius * 0.5, enemy.radius - 6);
    ctx.lineTo(0, enemy.radius + sway);
    ctx.lineTo(-enemy.radius * 0.5, enemy.radius - 6);
    ctx.closePath();
    ctx.fill();
    drawEyes(0, -4, 5, '#3a2a7a');
  }

  function drawHerald(enemy, time) {
    // Rotating rune ring.
    ctx.strokeStyle = enemy.enraged ? '#ff5b6a' : enemy.color;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.rotate(time * (enemy.enraged ? 0.9 : 0.4));
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 16, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (enemy.radius + 16), Math.sin(a) * (enemy.radius + 16), 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Robe.
    ctx.fillStyle = '#241536';
    ctx.beginPath();
    ctx.moveTo(-enemy.radius, enemy.radius);
    ctx.quadraticCurveTo(-enemy.radius * 0.8, -enemy.radius * 0.5, 0, -enemy.radius * 1.05);
    ctx.quadraticCurveTo(enemy.radius * 0.8, -enemy.radius * 0.5, enemy.radius, enemy.radius);
    ctx.closePath();
    ctx.fill();
    // Crown.
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(-20, -enemy.radius * 0.72);
    ctx.lineTo(-20, -enemy.radius - 14);
    ctx.lineTo(-10, -enemy.radius * 0.8);
    ctx.lineTo(0, -enemy.radius - 20);
    ctx.lineTo(10, -enemy.radius * 0.8);
    ctx.lineTo(20, -enemy.radius - 14);
    ctx.lineTo(20, -enemy.radius * 0.72);
    ctx.closePath();
    ctx.fill();
    // Burning core.
    const corePulse = 1 + Math.sin(time * 5) * 0.15;
    ctx.fillStyle = '#ff8ad8';
    ctx.beginPath();
    ctx.arc(0, 4, 11 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(0, -enemy.radius * 0.45, 9, '#ff8ad8');
  }

  function drawEyes(x, y, gap, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - gap, y, 2.6, 0, Math.PI * 2);
    ctx.arc(x + gap, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(state, time) {
    const p = state.player;
    if (!p || p.dead) return;
    const bob = p.moving ? Math.sin(p.walkPhase) * 2 : Math.sin(time * 2) * 1.2;
    ctx.save();
    ctx.translate(p.x, p.y + bob * 0.4);

    // The lantern's warm pool of light.
    const light = ctx.createRadialGradient(0, 0, 10, 0, 0, 170);
    light.addColorStop(0, 'rgba(255, 201, 102, 0.20)');
    light.addColorStop(1, 'rgba(255, 201, 102, 0)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(0, 0, 170, 0, Math.PI * 2);
    ctx.fill();

    if (p.invulnerable > 0 && p.dashTime <= 0) ctx.globalAlpha = 0.6;

    // Robe.
    ctx.fillStyle = PALETTE.playerRobe;
    ctx.beginPath();
    ctx.moveTo(-14, 16);
    ctx.quadraticCurveTo(-15, -6, 0, -13);
    ctx.quadraticCurveTo(15, -6, 14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.playerTrim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.quadraticCurveTo(0, 6, 12, 12);
    ctx.stroke();
    // Head and hood.
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c4f78';
    ctx.beginPath();
    ctx.arc(0, -16, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    // The lantern, held toward the aim.
    const lx = Math.cos(p.faceAngle) * 24;
    const ly = Math.sin(p.faceAngle) * 24;
    ctx.shadowColor = PALETTE.lantern;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = PALETTE.lanternHot;
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#8a6a3a';
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Faint aim dots toward the mouse.
    ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.cos(p.faceAngle) * (34 + i * 22), Math.sin(p.faceAngle) * (34 + i * 22), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (p.hurtFlash > 0) {
      ctx.globalAlpha = Math.min(1, p.hurtFlash / 0.35) * 0.5;
      ctx.fillStyle = '#ff5b6a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawBolts(state) {
    ctx.save();
    ctx.lineCap = 'round';
    for (const bolt of state.arsenal.bolts) {
      const angle = Math.atan2(bolt.vy, bolt.vx);
      ctx.strokeStyle = PALETTE.bolt;
      ctx.shadowColor = PALETTE.bolt;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bolt.x - Math.cos(angle) * 14, bolt.y - Math.sin(angle) * 14);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOrbitals(state) {
    const p = state.player;
    if (!p || p.orbitals <= 0 || p.dead) return;
    for (let o = 0; o < p.orbitals; o += 1) {
      const angle = state.arsenal.orbitAngle + (o / p.orbitals) * Math.PI * 2;
      const ox = p.x + Math.cos(angle) * 64;
      const oy = p.y + Math.sin(angle) * 64;
      ctx.shadowColor = PALETTE.lantern;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PALETTE.lanternHot;
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawGlobs(state, time) {
    for (const glob of state.arsenal.globs) {
      const wobble = 1 + Math.sin(time * 10 + glob.x) * 0.15;
      ctx.shadowColor = PALETTE.glob;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.glob;
      ctx.beginPath();
      ctx.arc(glob.x, glob.y, 7 * wobble, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawDarkness(state, time) {
    // Gloom presses in from the edges; it breathes with the wave.
    const b = state.bounds;
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    const radius = Math.hypot(b.right - b.left, b.bottom - b.top) / 2;
    const breathe = 0.32 + 0.06 * Math.sin(time * 0.7);
    const dark = ctx.createRadialGradient(cx, cy, radius * 0.42, cx, cy, radius * 0.95);
    dark.addColorStop(0, 'rgba(6, 4, 20, 0)');
    dark.addColorStop(1, `rgba(6, 4, 20, ${breathe})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, width, height);
  }

  function drawVignette(state) {
    const p = state.player;
    if (!p) return;
    let alpha = p.hurtFlash > 0 ? Math.min(0.5, p.hurtFlash) : 0;
    if (!p.dead && p.hp > 0 && p.hp < 30) {
      alpha = Math.max(alpha, 0.18 + 0.12 * Math.sin(state.renderTime * 4));
    }
    if (alpha <= 0) return;
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.32,
      width / 2, height / 2, Math.max(width, height) * 0.72,
    );
    grad.addColorStop(0, 'rgba(255, 40, 60, 0)');
    grad.addColorStop(1, `rgba(255, 40, 60, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  return { resize, draw, get width() { return width; }, get height() { return height; } };
}
