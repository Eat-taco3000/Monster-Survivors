// Player entity
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 18);
    this.speed = 200;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.invulnTimer = 0; // Invulnerability frames after taking damage
    this.invulnDuration = 0.5;
    this.facingAngle = 0; // Direction player faces
    this.moving = false;
    this.animTimer = 0;

    // Stats that can be upgraded
    this.damageMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.maxHealthBonus = 0;
    this.armor = 0;

    // Debuffs
    this.silenceTimer = 0;    // Prevents shooting while > 0
    this.silenceDuration = 3; // Seconds silenced by bat hit
  }

  get isSilenced() {
    return this.silenceTimer > 0;
  }

  get effectiveMaxHealth() {
    return this.maxHealth + this.maxHealthBonus;
  }

  get effectiveSpeed() {
    return this.speed * this.speedMultiplier;
  }

  update(dt, game) {
    super.update(dt);

    // Movement
    const move = Input.getMovement();
    this.moving = move.x !== 0 || move.y !== 0;

    if (this.moving) {
      this.x += move.x * this.effectiveSpeed * dt;
      this.y += move.y * this.effectiveSpeed * dt;
      this.facingAngle = Math.atan2(move.y, move.x);
    }

    // Animation timer
    this.animTimer += dt;

    // Invulnerability timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
    }

    // Silence timer
    if (this.silenceTimer > 0) {
      this.silenceTimer -= dt;
    }
  }

  takeDamage(amount, game) {
    if (this.invulnTimer > 0) return;

    const finalDamage = Math.max(1, amount - this.armor);
    this.health -= finalDamage;
    this.invulnTimer = this.invulnDuration;
    this.flashTimer = 0.15;

    // Damage particles
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, '#ff4444', 5);
    }

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  heal(amount) {
    this.health = Math.min(this.effectiveMaxHealth, this.health + amount);
  }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);
    const sx = screen.x;
    const sy = screen.y;

    // Flicker during invulnerability
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2 === 0) {
      return;
    }

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 14, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const flashColor = this.flashTimer > 0;
    ctx.fillStyle = flashColor ? '#ffffff' : '#4a6fa5';
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = flashColor ? '#ffffff' : '#2d4a7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(sx - 4, sy - 5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Silence aura - purple ring when silenced
    if (this.isSilenced) {
      const silencePulse = Math.sin(performance.now() / 150) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = silencePulse * 0.6;
      ctx.strokeStyle = '#aa44ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Eyes - face movement direction or nearest enemy
    const eyeAngle = this.facingAngle;
    const eyeDist = 6;
    const eyeSize = 4;

    // Left eye
    const leX = sx + Math.cos(eyeAngle - 0.4) * eyeDist;
    const leY = sy + Math.sin(eyeAngle - 0.4) * eyeDist;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(leX, leY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(leX + Math.cos(eyeAngle) * 1.5, leY + Math.sin(eyeAngle) * 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    const reX = sx + Math.cos(eyeAngle + 0.4) * eyeDist;
    const reY = sy + Math.sin(eyeAngle + 0.4) * eyeDist;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(reX, reY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(reX + Math.cos(eyeAngle) * 1.5, reY + Math.sin(eyeAngle) * 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
