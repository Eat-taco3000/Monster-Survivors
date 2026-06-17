// Projectile system
class Projectile extends Entity {
  constructor(x, y, angle, speed, damage, config = {}) {
    super(x, y, config.radius || 6);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.lifetime = config.lifetime || 3;
    this.pierce = config.pierce || 1; // How many enemies it can hit
    this.hitEnemies = new Set(); // Track which enemies were already hit
    this.knockback = config.knockback || 0;
    this.trail = []; // Trail positions
    this.trailLength = config.trailLength || 8;
    this.color = config.color || '#cc0000';
    this.glowColor = config.glowColor || '#ff0000';
    this.type = config.type || 'default';
    this.homingStrength = config.homingStrength || 0; // 0 = no homing, higher = stronger homing
  }

  update(dt, game) {
    super.update(dt);

    // Homing: adjust angle toward nearest enemy
    if (this.homingStrength > 0 && game.enemies.length > 0) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const dist = this.distanceTo(enemy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = enemy;
        }
      }
      if (nearest) {
        const targetAngle = this.angleTo(nearest);
        let angleDiff = targetAngle - this.angle;
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * this.homingStrength * dt;
      }
    }

    // Move in direction
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Update trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    // Lifetime
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  onHitEnemy(enemy, game) {
    this.hitEnemies.add(enemy);
    this.pierce--;
    if (this.pierce <= 0) {
      this.alive = false;
    }
  }

  hasHit(enemy) {
    return this.hitEnemies.has(enemy);
  }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);

    ctx.save();

    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const ts = Camera.worldToScreen(t.x, t.y);
      const alpha = (1 - i / this.trail.length) * 0.4;
      const size = this.radius * (1 - i / this.trail.length);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(ts.x, ts.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Glow
    const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, this.radius * 3);
    gradient.addColorStop(0, this.glowColor + '66');
    gradient.addColorStop(1, this.glowColor + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Explosion class for AoE attacks (used by Fire Wand)
class Explosion extends Entity {
  constructor(x, y, radius, damage, lifetime = 0.4, opts = {}) {
    super(x, y, radius || 16);
    this.radius = Math.max(0, Number(radius) || 0);
    this.damage = Math.max(0, Number(damage) || 0);
    this.lifetime = Number(lifetime) || 0.25;
    this.color = (opts && opts.color) || '#ff7a00';
    this.glow = (opts && opts.glow) || '#ffb244';
    this.source = (opts && opts.source) || null;
    this.type = 'explosion';
    this.knockback = Number(opts.knockback) || 120;
    this._applied = false;
    this._hitEnemies = new Set();
  }

  update(dt, game) {
    super.update(dt);

    if (!this._applied) {
      this._applied = true;
      for (const enemy of game.enemies) {
        try {
          if (!enemy || !enemy.alive) continue;
          const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
          if (dist <= this.radius + enemy.radius) {
            const kbAngle = Utils.angle(this.x, this.y, enemy.x, enemy.y);
            const dmg = this.damage * (this.source && this.source.damageMultiplier ? this.source.damageMultiplier : 1);
            enemy.takeDamage(dmg, kbAngle, this.knockback, game);
            game.particles.spawnText(enemy.x + Utils.randomRange(-8, 8), enemy.y - 18, `${Math.round(dmg)}`, '#ff9444');
            this._hitEnemies.add(enemy);
          }
        } catch (err) {
          console.error('Explosion apply error', err, { explosion: this, enemy });
        }
      }
    }

    this.lifetime -= dt;
    if (this.lifetime <= 0) this.alive = false;
  }

  hasHit(enemy) { return this._hitEnemies.has(enemy); }
  onHitEnemy(enemy, game) { this._hitEnemies.add(enemy); }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);
    ctx.save();

    // Outer glow
    const g = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, this.radius * 1.6);
    g.addColorStop(0, this.glow + '88');
    g.addColorStop(0.6, this.color + '66');
    g.addColorStop(1, this.color + '00');
    ctx.fillStyle = g;
    const drawRadius = (this.radius / Math.max(0.001, Camera.scale || 1)) * (1 + Math.sin(performance.now() / 120) * 0.06);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(2, drawRadius), 0, Math.PI * 2);
    ctx.fill();

    // Core flash
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(4, drawRadius * 0.22), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
