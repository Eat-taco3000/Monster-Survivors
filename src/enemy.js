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

drawVampire(ctx, sx, sy) {
    const flash = this.flashTimer > 0;

    // Cape (dark swoosh behind)
    const bobY = Math.sin(this.animTimer) * 2;
    ctx.fillStyle = flash ? '#ffffff' : '#1a0a0a';
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy - 8 + bobY);
    ctx.lineTo(sx - 16, sy + 12 + bobY);
    ctx.lineTo(sx + 16, sy + 12 + bobY);
    ctx.lineTo(sx + 12, sy - 8 + bobY);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = flash ? '#ffffff' : '#2a1a2e';
    ctx.beginPath();
    ctx.arc(sx, sy + bobY, this.radius - 2, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = flash ? '#ffffff' : '#1a0a1e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy + bobY, this.radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Collar / high collar effect
    ctx.fillStyle = flash ? '#ffffff' : '#1a0a1e';
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 10 + bobY);
    ctx.lineTo(sx - 4, sy - 14 + bobY);
    ctx.lineTo(sx, sy - 10 + bobY);
    ctx.lineTo(sx + 4, sy - 14 + bobY);
    ctx.lineTo(sx + 8, sy - 10 + bobY);
    ctx.closePath();
    ctx.fill();

    // Glowing red eyes
    const eyeGlow = Math.sin(this.animTimer * 2) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
    // Left eye
    ctx.beginPath();
    ctx.arc(sx - 5, sy - 3 + bobY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(sx + 5, sy - 3 + bobY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fangs
    ctx.fillStyle = '#dddddd';
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + 2 + bobY);
    ctx.lineTo(sx - 2, sy + 6 + bobY);
    ctx.lineTo(sx - 1, sy + 2 + bobY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 1, sy + 2 + bobY);
    ctx.lineTo(sx + 2, sy + 6 + bobY);
    ctx.lineTo(sx + 3, sy + 2 + bobY);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 5 + bobY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawZombie(ctx, sx, sy) {
    const flash = this.flashTimer > 0;
    const bobY = Math.sin(this.animTimer * 0.8) * 1.5; // Slow shamble

    // Body - sickly green
    ctx.fillStyle = flash ? '#ffffff' : '#3a5c2a';
    ctx.beginPath();
    ctx.arc(sx, sy + bobY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flash ? '#ffffff' : '#2a4a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy + bobY, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Torn clothing patches
    ctx.fillStyle = flash ? '#ffffff' : '#556b2f';
    ctx.fillRect(sx - 6, sy - 4 + bobY, 5, 8);
    ctx.fillRect(sx + 2, sy - 2 + bobY, 4, 6);

    // Rotten eyes - X-shaped
    ctx.strokeStyle = flash ? '#ffffff' : '#ff4400';
    ctx.lineWidth = 2;
    // Left eye X
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy - 6 + bobY); ctx.lineTo(sx - 3, sy - 2 + bobY);
    ctx.moveTo(sx - 3, sy - 6 + bobY); ctx.lineTo(sx - 7, sy - 2 + bobY);
    ctx.stroke();
    // Right eye X
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy - 6 + bobY); ctx.lineTo(sx + 7, sy - 2 + bobY);
    ctx.moveTo(sx + 7, sy - 6 + bobY); ctx.lineTo(sx + 3, sy - 2 + bobY);
    ctx.stroke();

    // Exposed teeth / mouth
    ctx.fillStyle = '#cccccc';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(sx - 5 + i * 3, sy + 4 + bobY, 2, 4);
    }
  }

  drawWerewolf(ctx, sx, sy) {
    const flash = this.flashTimer > 0;
    const runBob = Math.sin(this.animTimer * 6) * 3; // Fast run cycle

    // Body - dark brown/grey fur
    ctx.fillStyle = flash ? '#ffffff' : '#4a3520';
    ctx.beginPath();
    ctx.arc(sx, sy + runBob, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flash ? '#ffffff' : '#2e2010';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy + runBob, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Ears (pointy wolf ears)
    ctx.fillStyle = flash ? '#ffffff' : '#4a3520';
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 10 + runBob);
    ctx.lineTo(sx - 13, sy - 20 + runBob);
    ctx.lineTo(sx - 2, sy - 10 + runBob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy - 10 + runBob);
    ctx.lineTo(sx + 13, sy - 20 + runBob);
    ctx.lineTo(sx + 2, sy - 10 + runBob);
    ctx.closePath();
    ctx.fill();

    // Inner ear
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 11 + runBob);
    ctx.lineTo(sx - 12, sy - 19 + runBob);
    ctx.lineTo(sx - 3, sy - 11 + runBob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy - 11 + runBob);
    ctx.lineTo(sx + 12, sy - 19 + runBob);
    ctx.lineTo(sx + 3, sy - 11 + runBob);
    ctx.closePath();
    ctx.fill();

    // Yellow eyes glow
    ctx.save();
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffaa00';
    ctx.fillStyle = flash ? '#ffffff' : '#ffcc00';
    ctx.beginPath();
    ctx.arc(sx - 5, sy - 3 + runBob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + 5, sy - 3 + runBob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Claws / snout
    ctx.fillStyle = flash ? '#ffffff' : '#ccbbaa';
    ctx.fillRect(sx - 4, sy + 3 + runBob, 8, 4);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + 7 + runBob); ctx.lineTo(sx - 2, sy + 11 + runBob);
    ctx.moveTo(sx, sy + 7 + runBob);     ctx.lineTo(sx, sy + 11 + runBob);
    ctx.moveTo(sx + 3, sy + 7 + runBob); ctx.lineTo(sx + 2, sy + 11 + runBob);
    ctx.stroke();
  }

  drawGhost(ctx, sx, sy) {
    const flash = this.flashTimer > 0;
    const t = performance.now() / 800;
    const bobY = Math.sin(t) * 5;  // Floating bob
    const alpha = Math.sin(t * 1.3) * 0.15 + 0.75; // Phasing opacity

    ctx.save();
    ctx.globalAlpha = flash ? 1 : alpha;

    // Ghostly body - semi-transparent white/blue
    const gradient = ctx.createRadialGradient(sx, sy + bobY, 2, sx, sy + bobY, this.radius + 4);
    gradient.addColorStop(0, flash ? '#ffffff' : '#aaddff');
    gradient.addColorStop(0.6, flash ? '#ccccff' : '#6699cc');
    gradient.addColorStop(1, 'rgba(100,150,220,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy + bobY, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Core body shape (rounded top, wispy bottom)
    ctx.fillStyle = flash ? '#ffffff' : 'rgba(180, 210, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(sx, sy - 2 + bobY, this.radius, Math.PI, 0); // Top half circle
    ctx.lineTo(sx + this.radius, sy + 8 + bobY);
    // Wavy bottom
    ctx.quadraticCurveTo(sx + this.radius * 0.6, sy + 14 + bobY, sx + this.radius * 0.3, sy + 10 + bobY);
    ctx.quadraticCurveTo(sx, sy + 16 + bobY, sx - this.radius * 0.3, sy + 10 + bobY);
    ctx.quadraticCurveTo(sx - this.radius * 0.6, sy + 14 + bobY, sx - this.radius, sy + 8 + bobY);
    ctx.closePath();
    ctx.fill();

    // Dark hollow eyes
    ctx.globalAlpha = flash ? 0.5 : 0.9;
    ctx.fillStyle = '#001133';
    ctx.beginPath();
    ctx.ellipse(sx - 5, sy - 4 + bobY, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 5, sy - 4 + bobY, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBat(ctx, sx, sy) {
    const flash = this.flashTimer > 0;
    const wingFlap = Math.sin(this.animTimer * 15) * 0.4; // Very fast wing flap
    const bobY = Math.sin(this.animTimer * 8) * 2;

    ctx.save();

    // Wings
    ctx.fillStyle = flash ? '#ffffff' : '#220022';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(sx, sy + bobY);
    ctx.quadraticCurveTo(sx - 14, sy - 8 + wingFlap * 12 + bobY, sx - 22, sy + bobY);
    ctx.quadraticCurveTo(sx - 16, sy + 8 - wingFlap * 5 + bobY, sx, sy + 4 + bobY);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(sx, sy + bobY);
    ctx.quadraticCurveTo(sx + 14, sy - 8 + wingFlap * 12 + bobY, sx + 22, sy + bobY);
    ctx.quadraticCurveTo(sx + 16, sy + 8 - wingFlap * 5 + bobY, sx, sy + 4 + bobY);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = flash ? '#ffffff' : '#330033';
    ctx.beginPath();
    ctx.ellipse(sx, sy + bobY, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = flash ? '#ffffff' : '#220022';
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy - 6 + bobY);
    ctx.lineTo(sx - 6, sy - 13 + bobY);
    ctx.lineTo(sx - 1, sy - 6 + bobY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy - 6 + bobY);
    ctx.lineTo(sx + 6, sy - 13 + bobY);
    ctx.lineTo(sx + 1, sy - 6 + bobY);
    ctx.fill();

    // Tiny red eyes
    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = flash ? '#ffffff' : '#ff0000';
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 1 + bobY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + 3, sy - 1 + bobY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
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
