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
    this.chainFalloff = config.chainFalloff || 0.7;
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
    if (this.type === 'lightningStrike') {
      this.chainLightning(enemy, game);
    }
    this.pierce--;
    if (this.pierce <= 0) {
      this.alive = false;
    }
  }

  hasHit(enemy) {
    return this.hitEnemies.has(enemy);
  }

  chainLightning(startEnemy, game) {
    const visited = new Set([startEnemy]);
    const queue = [{ enemy: startEnemy, depth: 1 }];

    while (queue.length > 0) {
      const current = queue.shift();

      for (const enemy of game.enemies) {
        if (!enemy || !enemy.alive || visited.has(enemy)) continue;
        if (Utils.distance(current.enemy.x, current.enemy.y, enemy.x, enemy.y) > current.enemy.radius + enemy.radius) continue;

        visited.add(enemy);
        this.hitEnemies.add(enemy);
        if (this.chainLinks) {
          this.chainLinks.push({ from: current.enemy, to: enemy, depth: current.depth });
        }

        const chainDamage = this.damage * Math.pow(this.chainFalloff, current.depth);
        const knockbackAngle = Utils.angle(current.enemy.x, current.enemy.y, enemy.x, enemy.y);
        enemy.takeDamage(chainDamage, knockbackAngle, this.knockback * 0.35, game);

        if (game.particles) {
          game.particles.spawnBurst(enemy.x, enemy.y, this.color, 5);
          game.particles.spawnText(
            enemy.x + Utils.randomRange(-8, 8),
            enemy.y - 18,
            Math.round(chainDamage).toString(),
            this.color
          );
        }

        queue.push({ enemy, depth: current.depth + 1 });
      }
    }
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

class LightningStrike extends Entity {
  constructor(source, target, damage, config = {}) {
    super(target.x, target.y, config.radius || 14);
    this.source = source;
    this.target = target;
    this.damage = damage;
    this.lifetime = config.lifetime || 0.16;
    this.color = config.color || '#f7e65a';
    this.glowColor = config.glowColor || '#7de7ff';
    this.knockback = config.knockback || 40;
    this.chainFalloff = config.chainFalloff || 0.7;
    this.type = 'lightningStrike';
    this.handlesOwnCollision = true;
    this.hitEnemies = new Set();
    this.chainLinks = [];
    this._applied = false;
  }

  update(dt, game) {
    super.update(dt);

    if (!this._applied) {
      this._applied = true;
      if (this.target && this.target.alive) {
        this.x = this.target.x;
        this.y = this.target.y;
        const knockbackAngle = Utils.angle(this.source.x, this.source.y, this.target.x, this.target.y);
        this.target.takeDamage(this.damage, knockbackAngle, this.knockback, game);
        this.hitEnemies.add(this.target);
        this.chainLightning(this.target, game);

        if (game.particles) {
          game.particles.spawnBurst(this.target.x, this.target.y, this.color, 8);
          game.particles.spawnText(
            this.target.x + Utils.randomRange(-8, 8),
            this.target.y - 18,
            Math.round(this.damage).toString(),
            this.color
          );
        }
      }
    }

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  chainLightning(startEnemy, game) {
    return Projectile.prototype.chainLightning.call(this, startEnemy, game);
  }

  hasHit(enemy) {
    return this.hitEnemies.has(enemy);
  }

  onHitEnemy(enemy, game) {
    this.hitEnemies.add(enemy);
  }

  draw(ctx) {
    this.drawBolt(ctx, this.source, { x: this.x, y: this.y }, false);

    for (const link of this.chainLinks) {
      this.drawBolt(ctx, link.from, link.to, true);
    }
  }

  drawBolt(ctx, from, to, showJumpMarker) {
    const start = Camera.worldToScreen(from.x, from.y);
    const end = Camera.worldToScreen(to.x, to.y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const segments = Math.max(4, Math.floor(len / 28));
    const zigAmount = Math.min(18, Math.max(8, len * 0.12));
    const points = [];

    points.push({ x: start.x, y: start.y });
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const offset = (i % 2 === 0 ? 1 : -1) * zigAmount;
      points.push({
        x: start.x + dx * t + px * offset,
        y: start.y + dy * t + py * offset
      });
    }
    points.push({ x: end.x, y: end.y });

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.glowColor;

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const sx = b.x - a.x;
      const sy = b.y - a.y;
      const segmentLen = Math.max(1, Math.sqrt(sx * sx + sy * sy));

      ctx.save();
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.rotate(Math.atan2(sy, sx));
      ctx.fillStyle = i % 2 === 0 ? this.color : '#ffffff';
      ctx.fillRect(-segmentLen / 2 - 2, -5, segmentLen + 4, 10);
      ctx.restore();
    }

    if (showJumpMarker) {
      ctx.save();
      ctx.translate((start.x + end.x) / 2, (start.y + end.y) / 2);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, -4, 18, 8);
      ctx.fillStyle = this.color;
      ctx.fillRect(-5, -7, 10, 14);
      ctx.restore();
    } else {
      ctx.fillStyle = this.glowColor;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 13, 0, Math.PI * 2);
      ctx.fill();
    }

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
    this.handlesOwnCollision = true;
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
  constructor(followTarget, opts = {}) {
    // opts may be either (radius, damagePerTick, duration, tickInterval, ...) or an options object
    const radius = Number(opts.radius || opts.abilityRadius || 100);
    super(followTarget.x, followTarget.y, radius);
    this.followTarget = followTarget;
    this.radius = radius;
    this.damagePerTick = Number(opts.damagePerTick || opts.abilityDamagePerTick || 6);
    this.tickInterval = Number(opts.tickInterval || opts.abilityTickInterval || 0.5);
    this.duration = Number(opts.duration || opts.abilityDuration || 4.0);
    this.slowFactor = Number(opts.slowFactor || opts.slow || 0.6);
    this.slowDuration = Number(opts.slowDuration || opts.slowDuration || 2.0);
    this.color = opts.color || '#66ddff';
    this.glow = opts.glow || '#99eeff';

    this.elapsed = 0;
    this._tickTimer = 0;
    this.alive = true;
    this.type = 'iceField';
    this.handlesOwnCollision = true;
  }

  update(dt, game) {
    if (!this.followTarget || !this.followTarget.alive) { this.alive = false; return; }
    // follow player
    this.x = this.followTarget.x;
    this.y = this.followTarget.y;

    this.elapsed += dt;
    this._tickTimer += dt;

    // On each tick, damage enemies inside radius and apply slow
    if (this._tickTimer >= this.tickInterval) {
      this._tickTimer -= this.tickInterval;
      for (const enemy of game.enemies) {
        if (!enemy || !enemy.alive) continue;
        const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
        if (dist <= this.radius + enemy.radius) {
          try {
            const mult = (this.followTarget && this.followTarget.damageMultiplier) ? this.followTarget.damageMultiplier : 1;
            enemy.takeDamage(this.damagePerTick * mult, 0, 0, game);
            // Apply slow: set slowFactor and slowTimer on enemy (enemy handles decay)
            if (!enemy.slowFactor || enemy.slowFactor > this.slowFactor) {
              enemy.slowFactor = this.slowFactor;
            }
            enemy.slowTimer = Math.max(enemy.slowTimer || 0, this.slowDuration);

            if (game.particles) {
              game.particles.spawnText(enemy.x + Utils.randomRange(-6, 6), enemy.y - 18, `${Math.round(this.damagePerTick)}`, '#aee6ff');
            }
          } catch (err) {
            console.error('IceField tick error', err, { ice: this, enemy });
          }
        }
      }
    }

    if (this.elapsed >= this.duration) {
      this.alive = false;
    }
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
