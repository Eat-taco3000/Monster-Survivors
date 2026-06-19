// Particle system for visual effects
const Particles = {
  particles: [],

  init() {
    this.particles = [];
  },

  // Spawn a burst of particles at position
  spawnBurst(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Utils.randomRange(40, 120);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Utils.randomRange(0.2, 0.5),
        maxLife: 0.5,
        radius: Utils.randomRange(2, 5),
        color: color,
        friction: 0.92
      });
    }
  },

  // Spawn a directional burst
  spawnDirectional(x, y, angle, spread, color, count = 3) {
    for (let i = 0; i < count; i++) {
      const a = angle + Utils.randomRange(-spread, spread);
      const speed = Utils.randomRange(60, 150);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: Utils.randomRange(0.2, 0.4),
        maxLife: 0.4,
        radius: Utils.randomRange(2, 4),
        color: color,
        friction: 0.9
      });
    }
  },

  // Floating text particle (for damage numbers, level up text, etc.)
  spawnText(x, y, text, color = '#ffffff') {
    this.particles.push({
      x: x,
      y: y,
      vx: Utils.randomRange(-10, 10),
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      text: text,
      color: color,
      type: 'text',
      friction: 0.98
    });
  },

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.friction;
      p.vy *= p.friction;

      if (p.type === 'text') {
        p.vy *= 0.97;
      }
    }
  },

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;

      if (p.type === 'text') {
        const screen = Camera.worldToScreen(p.x, p.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, screen.x, screen.y);
      } else {
        const screen = Camera.worldToScreen(p.x, p.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.radius * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
};
