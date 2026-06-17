// XP Gem system
class XPGem extends Entity {
  constructor(x, y, value, sourceType = 'default') {
    super(x, y, 8);
    this.value = value;
    this.magnetRange = 80;
    this.collectRange = 15;
    this.speed = 300;
    this.attracted = false;
    this.animTimer = Math.random() * Math.PI * 2;
    this.spawnVel = { x: Utils.randomRange(-50, 50), y: Utils.randomRange(-50, 50) };
    this.settled = false;
    this.settleTimer = 0.3;
    this.sourceType = sourceType;

    // Visual based on source and value
    if (sourceType === 'vampire') {
      // Red/crimson crystals from vampires
      if (value >= 5) {
        this.gemColor = '#cc0033';
        this.gemGlow = '#ff0044';
        this.radius = 10;
        this.magnetRange = 120;
      } else if (value >= 3) {
        this.gemColor = '#dd1133';
        this.gemGlow = '#ff3355';
        this.radius = 9;
        this.magnetRange = 100;
      } else {
        this.gemColor = '#cc0022';
        this.gemGlow = '#ff2244';
        this.radius = 7;
      }
    } else {
      // Default blue gems
      if (value >= 5) {
        this.gemColor = '#ff6600';
        this.gemGlow = '#ff8800';
        this.radius = 10;
        this.magnetRange = 120;
      } else if (value >= 3) {
        this.gemColor = '#00cc66';
        this.gemGlow = '#00ff88';
        this.radius = 9;
        this.magnetRange = 100;
      } else {
        this.gemColor = '#4488ff';
        this.gemGlow = '#66aaff';
        this.radius = 7;
      }
    }
  }

  update(dt, game) {
    super.update(dt);

    this.animTimer += dt * 4;

    // Settle after spawning (little pop-out animation)
    if (!this.settled) {
      this.settleTimer -= dt;
      this.x += this.spawnVel.x * dt;
      this.y += this.spawnVel.y * dt;
      this.spawnVel.x *= 0.9;
      this.spawnVel.y *= 0.9;
      if (this.settleTimer <= 0) {
        this.settled = true;
      }
    }

    // Attract toward player when in range
    const player = game.player;
    if (player && player.alive) {
      const dist = this.distanceTo(player);

      // Magnetize when in range
      if (dist < this.magnetRange) {
        this.attracted = true;
      }

      if (this.attracted) {
        const angle = this.angleTo(player);
        this.x += Math.cos(angle) * this.speed * dt;
        this.y += Math.sin(angle) * this.speed * dt;

        // Speed up as it gets closer
        const speedMult = 1 + (1 - dist / this.magnetRange) * 2;
        this.x += Math.cos(angle) * this.speed * speedMult * dt;
        this.y += Math.sin(angle) * this.speed * speedMult * dt;
      }

      // Collect
      if (dist < this.collectRange) {
        this.collect(game);
      }
    }
  }

  collect(game) {
    this.alive = false;
    game.addXP(this.value);
  }

  draw(ctx) {
    const screen = Camera.worldToScreen(this.x, this.y);
    const sx = screen.x;
    const sy = screen.y;

    ctx.save();

    // Glow
    const pulse = Math.sin(this.animTimer) * 0.15 + 0.35;
    ctx.globalAlpha = pulse;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.radius * 2.5);
    gradient.addColorStop(0, this.gemGlow + '88');
    gradient.addColorStop(1, this.gemGlow + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // Diamond shape
    const bob = Math.sin(this.animTimer) * 2;
    ctx.fillStyle = this.gemColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - this.radius + bob);
    ctx.lineTo(sx + this.radius * 0.7, sy + bob);
    ctx.lineTo(sx, sy + this.radius + bob);
    ctx.lineTo(sx - this.radius * 0.7, sy + bob);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - this.radius + bob + 2);
    ctx.lineTo(sx + this.radius * 0.3, sy + bob);
    ctx.lineTo(sx, sy + 2 + bob);
    ctx.lineTo(sx - this.radius * 0.3, sy + bob);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// XP Gem Manager
const XPGemSystem = {
  gems: [],

  init() {
    this.gems = [];
  },

  spawnGems(x, y, totalValue, sourceType = 'default') {
    // Split into individual gems
    if (totalValue >= 5) {
      // One big gem
      this.gems.push(new XPGem(x, y, totalValue, sourceType));
    } else if (totalValue >= 3) {
      // A couple medium gems
      const count = Utils.randomInt(1, 3);
      for (let i = 0; i < count && totalValue > 0; i++) {
        const val = Math.min(totalValue, Utils.randomInt(1, 3));
        this.gems.push(new XPGem(
          x + Utils.randomRange(-10, 10),
          y + Utils.randomRange(-10, 10),
          val,
          sourceType
        ));
        totalValue -= val;
      }
    } else {
      // Small gems (always 1 per value for vampires)
      for (let i = 0; i < totalValue; i++) {
        this.gems.push(new XPGem(
          x + Utils.randomRange(-10, 10),
          y + Utils.randomRange(-10, 10),
          1,
          sourceType
        ));
      }
    }
  },

  update(dt, game) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.update(dt, game);
      if (!gem.alive) {
        this.gems.splice(i, 1);
      }
    }
  },

  draw(ctx) {
    for (const gem of this.gems) {
      if (Camera.isOnScreen(gem.x, gem.y, 50)) {
        gem.draw(ctx);
      }
    }
  }
};
