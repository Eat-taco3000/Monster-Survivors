// Ghost Orb System - projectiles fired by Ghost enemies at the player
const GhostOrbSystem = {
  orbs: [],

  init() {
    this.orbs = [];
  },

  spawn(x, y, angle, damage) {
    // Fire a spread of 3 orbs in a small arc
    const spread = 0.2;
    for (let i = -1; i <= 1; i++) {
      this.orbs.push({
        x: x,
        y: y,
        angle: angle + i * spread,
        speed: 130,
        damage: damage,
        radius: 7,
        lifetime: 3.5,
        trail: [],
        trailLength: 6,
        animTimer: Math.random() * Math.PI * 2
      });
    }
  },

  update(dt, game) {
    const player = game.player;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];

      orb.lifetime -= dt;
      orb.animTimer += dt * 4;

      if (orb.lifetime <= 0) {
        this.orbs.splice(i, 1);
        continue;
      }

      // Move
      orb.x += Math.cos(orb.angle) * orb.speed * dt;
      orb.y += Math.sin(orb.angle) * orb.speed * dt;

      // Update trail
      orb.trail.unshift({ x: orb.x, y: orb.y });
      if (orb.trail.length > orb.trailLength) orb.trail.pop();

      // Check hit on player
      if (player && player.alive) {
        const dist = Utils.distance(orb.x, orb.y, player.x, player.y);
        if (dist < orb.radius + player.radius) {
          player.takeDamage(orb.damage, game);
          game.particles.spawnBurst(orb.x, orb.y, '#88aaff', 5);
          this.orbs.splice(i, 1);
        }
      }
    }
  },

  draw(ctx) {
    for (const orb of this.orbs) {
      if (!Camera.isOnScreen(orb.x, orb.y, 60)) continue;

      const screen = Camera.worldToScreen(orb.x, orb.y);
      ctx.save();

      // Trail
      for (let i = 0; i < orb.trail.length; i++) {
        const t = orb.trail[i];
        const ts = Camera.worldToScreen(t.x, t.y);
        const alpha = (1 - i / orb.trail.length) * 0.35;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#6699cc';
        ctx.beginPath();
        ctx.arc(ts.x, ts.y, orb.radius * (1 - i / orb.trail.length), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Glow
      const pulse = Math.sin(orb.animTimer) * 0.2 + 0.5;
      ctx.globalAlpha = pulse;
      const glow = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, orb.radius * 3);
      glow.addColorStop(0, '#88ccff55');
      glow.addColorStop(1, '#88ccff00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, orb.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // Core orb
      ctx.fillStyle = '#aaddff';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, orb.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
};
