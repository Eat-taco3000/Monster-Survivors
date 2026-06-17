// Enemy system - Vampire enemy and base enemy class
class Enemy extends Entity {
  constructor(x, y, config = {}) {
    super(x, y, config.radius || 16);
    this.maxHealth = config.health || 30;
    this.health = this.maxHealth;
    this.speed = config.speed || 80;
    this.damage = config.damage || 10;
    this.xpValue = config.xpValue || 1;
    this.type = config.type || 'vampire';
    this.knockbackVel = { x: 0, y: 0 };
    this.knockbackDecay = 8; // How fast knockback fades
    this.contactCooldown = 0;
    this.contactCooldownMax = 1.0;
    this.animTimer = Math.random() * Math.PI * 2;

    // Slow effect
    this.slowFactor = 1.0; // 1.0 = normal speed
    this.slowTimer = 0;    // remaining seconds of slow
  }

  update(dt, game) {
    super.update(dt);

    // Decay slow effect
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1.0;
        this.slowTimer = 0;
      }
    }

    // Apply knockback
    this.x += this.knockbackVel.x * dt;
    this.y += this.knockbackVel.y * dt;

    // Decay knockback
    this.knockbackVel.x *= Math.max(0, 1 - this.knockbackDecay * dt);
    this.knockbackVel.y *= Math.max(0, 1 - this.knockbackDecay * dt);

    // Move toward player
    const player = game.player;
    if (player && player.alive) {
      const angle = this.angleTo(player);

      if (this.type === 'ghost') {
        // Ghost keeps distance - move away if too close, toward if too far
        const dist = this.distanceTo(player);
        if (dist < this.preferRange - 30) {
          // Too close - back away
          this.x -= Math.cos(angle) * this.speed * dt;
          this.y -= Math.sin(angle) * this.speed * dt;
        } else if (dist > this.preferRange + 50) {
          // Too far - drift closer
          this.x += Math.cos(angle) * this.speed * 0.5 * dt;
          this.y += Math.sin(angle) * this.speed * 0.5 * dt;
        }
        // Shoot orbs at player
        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
          this.shootCooldown = this.shootInterval;
          GhostOrbSystem.spawn(this.x, this.y, angle, this.orbDamage);
        }
      } else {
        // Respect slowFactor when moving
        const moveSpeed = this.speed * (this.slowFactor || 1);
        this.x += Math.cos(angle) * moveSpeed * dt;
        this.y += Math.sin(angle) * moveSpeed * dt;
      }
    }

    // Enemy separation - push away from other enemies to avoid pile-up
    for (const other of game.enemies) {
      if (other === this || !other.alive) continue;
      const dist = this.distanceTo(other);
      const minDist = this.radius + other.radius + 2;
      if (dist < minDist && dist > 0) {
        const pushAngle = Utils.angle(other.x, other.y, this.x, this.y);
        const pushForce = (minDist - dist) * 2;
        this.x += Math.cos(pushAngle) * pushForce * dt;
        this.y += Math.sin(pushAngle) * pushForce * dt;
      }
    }

    // Animation
    this.animTimer += dt * 3;

    // Contact damage cooldown
    if (this.contactCooldown > 0) {
      this.contactCooldown -= dt;
    }
  }

  takeDamage(amount, knockbackAngle, knockbackForce, game) {
    this.health -= amount;
    this.flashTimer = 0.1;

    // Apply knockback
    this.knockbackVel.x += Math.cos(knockbackAngle) * knockbackForce;
    this.knockbackVel.y += Math.sin(knockbackAngle) * knockbackForce;

    // Hit particles
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, '#ff6666', 3);
    }

    if (this.health <= 0) {
      this.die(game);
    }
  }

  die(game) {
    this.alive = false;

    // Death particles
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, '#880000', 10);
    }

    // Drop XP gems
    if (game && game.xpGems) {
      game.xpGems.spawnGems(this.x, this.y, this.xpValue, this.type);
    }

    // Track kill
    if (game) {
      game.kills++;
    }
  }

  // Check and apply contact damage to player
  checkContactDamage(player, game) {
    if (this.contactCooldown > 0) return false;
    if (!this.collidesWith(player)) return false;

    player.takeDamage(this.damage, game);
    this.contactCooldown = this.contactCooldownMax;

    // Bat silences player on hit
    if (this.silencesOnHit) {
      player.silenceTimer = player.silenceDuration;
      game.particles.spawnText(player.x, player.y - 35, 'SILENCED!', '#aa44ff');
      game.particles.spawnBurst(player.x, player.y, '#aa44ff', 8);
    }

    // Push enemy slightly away
    const angle = player.angleTo(this);
    this.knockbackVel.x += Math.cos(angle) * 50;
    this.knockbackVel.y += Math.sin(angle) * 50;

    return true;
  }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);
    const sx = screen.x;
    const sy = screen.y;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 12, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'vampire') {
      this.drawVampire(ctx, sx, sy);
    } else if (this.type === 'zombie') {
      this.drawZombie(ctx, sx, sy);
    } else if (this.type === 'werewolf') {
      this.drawWerewolf(ctx, sx, sy);
    } else if (this.type === 'ghost') {
      this.drawGhost(ctx, sx, sy);
    } else if (this.type === 'bat') {
      this.drawBat(ctx, sx, sy);
    }

    // Health bar (only if damaged)
    if (this.health < this.maxHealth) {
      const barWidth = 30;
      const barHeight = 3;
      const barX = sx - barWidth / 2;
      const barY = sy - this.radius - 8;
      const healthPercent = this.health / this.maxHealth;

      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    ctx.restore();
  }

  // ... draw methods unchanged ...
}

// Enemy factory
const EnemyFactory = {
  createVampire(x, y, difficultyMult = 1) {
    return new Enemy(x, y, {
      type: 'vampire',
      health: Math.floor(30 * difficultyMult),
      speed: 80 + (difficultyMult - 1) * 10,
      damage: Math.floor(10 * difficultyMult),
      radius: 16,
      xpValue: 1
    });
  },

  createZombie(x, y, difficultyMult = 1) {
    return new Enemy(x, y, {
      type: 'zombie',
      health: Math.floor(50 * difficultyMult),  // More HP than vampire
      speed: 45 + (difficultyMult - 1) * 5,    // Much slower
      damage: Math.floor(15 * difficultyMult),
      radius: 18,
      xpValue: 2
    });
  },

  createWerewolf(x, y, difficultyMult = 1) {
    const w = new Enemy(x, y, {
      type: 'werewolf',
      health: Math.floor(20 * difficultyMult),  // Lower HP than vampire
      speed: 160 + (difficultyMult - 1) * 15,  // Very fast
      damage: Math.floor(12 * difficultyMult),
      radius: 15,
      xpValue: 1
    });
    w.knockbackDecay = 14; // Resists knockback more
    return w;
  },

  createGhost(x, y, difficultyMult = 1) {
    const g = new Enemy(x, y, {
      type: 'ghost',
      health: Math.floor(25 * difficultyMult),
      speed: 55 + (difficultyMult - 1) * 8,   // Slow drifter
      damage: Math.floor(8 * difficultyMult),
      radius: 14,
      xpValue: 1
    });
    g.preferRange = 140 + Math.floor(10 * (difficultyMult - 1));
    g.shootCooldown = 0;
    g.shootInterval = 2.0;
    g.orbDamage = Math.floor(6 * difficultyMult);
    return g;
  },

  createBat(x, y, difficultyMult = 1) {
    const b = new Enemy(x, y, {
      type: 'bat',
      health: Math.floor(12 * difficultyMult),
      speed: 160 + (difficultyMult - 1) * 20,
      damage: Math.floor(6 * difficultyMult),
      radius: 12,
      xpValue: 1
    });
    b.silencesOnHit = true;
    return b;
  }
};
