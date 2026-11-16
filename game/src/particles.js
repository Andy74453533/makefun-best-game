// Particles and floating combat text. One pooled system the whole game feeds:
// hits, deaths, pickups, dashes, novas and level-ups all come through here.

const MAX_PARTICLES = 420;
const MAX_TEXTS = 26;

export function createParticles() {
  const parts = [];
  const texts = [];

  function burst(x, y, options = {}) {
    const {
      count = 10, color = '#ffd98a', speed = 180, life = 0.5,
      size = 3, glow = true, gravity = 0, spread = Math.PI * 2, angle = 0,
    } = options;
    for (let i = 0; i < count; i += 1) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.3 + Math.random() * 0.9);
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color, glow, gravity,
        drag: 0.88,
      });
    }
  }

  function ring(x, y, options = {}) {
    const { count = 26, color = '#ffd98a', speed = 320, life = 0.45, size = 3 } = options;
    for (let i = 0; i < count; i += 1) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const a = (i / count) * Math.PI * 2;
      parts.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life, maxLife: life, size, color, glow: true, gravity: 0, drag: 0.9,
      });
    }
  }

  function floatText(x, y, str, color = '#fff3d0', size = 16) {
    if (texts.length >= MAX_TEXTS) texts.shift();
    texts.push({
      x: x + (Math.random() - 0.5) * 14, y: y - 8, vy: -52,
      life: 0.8, maxLife: 0.8, str: String(str), color, size,
    });
  }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 0.94;
    }
  }

  function draw(ctx) {
    for (const p of parts) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${t.size}px Georgia, serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10, 8, 28, 0.85)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    parts.length = 0;
    texts.length = 0;
  }

  return { burst, ring, floatText, update, draw, clear, parts, texts };
}
