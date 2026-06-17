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

// IceField: follows the player and applies periodic damage and slow to nearby enemies
class IceField extends Entity {
  constructor(followTarget, radius, damagePerTick, duration, tickInterval = 0.5, opts = {}) {
    super(followTarget.x, followTarget.y, radius || 80);
    this.followTarget = followTarget;
    this.radius = Math.max(0, Number(radius) || 0);
    this.damagePerTick = Math.max(0, Number(damagePerTick) || 0);
    this.duration = Number(duration) || 3.0;
    this.tickInterval = Number(tickInterval) || 0.5;
    this.color = (opts && opts.color) || '#66ddff';
    this.glow = (opts && opts.glow) || '#99eeff';
    this.slowFactor = Number(opts && opts.slowFactor) || 0.6;
    this.slowDuration = Number(opts && opts.slowDuration) || 2.0;
    this.type = 'iceField';
    this._time = 0;
    this._tickTimer = 0;
    this._applied = false;
  }

  update(dt, game) {
    super.update(dt);

    // Follow the player
    if (this.followTarget) {
      this.x = this.followTarget.x;
      this.y = this.followTarget.y;
    }

    this._time += dt;
    this._tickTimer += dt;

    // On each tick, damage enemies inside radius and apply slow
    if (this._tickTimer >= this.tickInterval) {
      this._tickTimer -= this.tickInterval;
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
        if (dist <= this.radius + enemy.radius) {
          try {
            enemy.takeDamage(this.damagePerTick * (this.followTarget && this.followTarget.damageMultiplier ? this.followTarget.damageMultiplier : 1), Utils.angle(this.x, this.y, enemy.x, enemy.y), 0, game);
            // Apply slow: set slowFactor and slowTimer on enemy (enemy handles decay)
            if (!enemy.slowFactor || enemy.slowFactor > this.slowFactor) {
              enemy.slowFactor = this.slowFactor;
            }
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, this.slowDuration);

            game.particles.spawnText(enemy.x + Utils.randomRange(-6, 6), enemy.y - 18, `${Math.round(this.damagePerTick)}`, '#aee6ff');
          } catch (err) {
            console.error('IceField tick error', err, { ice: this, enemy });
          }
        }
      }
    }

    // Duration
    this.duration -= dt;
    if (this.duration <= 0) this.alive = false;
  }

  // Compatibility with projectile collision checks
  hasHit(enemy) { return false; }
  onHitEnemy(enemy, game) { /* no-op */ }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);
    ctx.save();

    // Soft icy ring
    const g = ctx.createRadialGradient(screen.x, screen.y, this.radius * 0.2, screen.x, screen.y, this.radius);
    g.addColorStop(0, this.glow + '22');
    g.addColorStop(0.6, this.color + '55');
    g.addColorStop(1, this.color + '00');
    ctx.fillStyle = g;
    const drawRadius = (this.radius / Math.max(0.001, Camera.scale || 1));
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(2, drawRadius), 0, Math.PI * 2);
    ctx.fill();

    // Center sparkle
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(3, drawRadius * 0.06), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
