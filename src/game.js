// Main Game class
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.gameOver = false;
    this.gameTime = 0;
    this.kills = 0;

    // Entities
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.xpGems = XPGemSystem;

    // Systems
    this.particles = Particles;

    // Background grid offset for visual movement feedback
    this.gridSize = 50;
  }

  init() {
    // Set canvas size
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Initialize input
    Input.init();

    // Reset all systems
    this.reset();
  }

  resize() {
    this.canvas.width = Math.min(window.innerWidth - 4, 1280);
    this.canvas.height = Math.min(window.innerHeight - 4, 720);
    Camera.init(this.canvas.width, this.canvas.height);
  }

  reset() {
    // Reset game state
    this.gameOver = false;
    this.gameTime = 0;
    this.kills = 0;

    // Create player at center of world
    this.player = new Player(0, 0);
    this.enemies = [];
    this.projectiles = [];

    // Initialize systems
    Camera.reset(0, 0);
    WeaponSystem.init();
    Leveling.init();
    XPGemSystem.init();
    GhostOrbSystem.init();
    Spawner.init();
    Particles.init();
  }

  start() {
    this.reset();
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Cap dt to prevent huge jumps
    dt = Math.min(dt, 0.05);

    if (!this.gameOver) {
      this.update(dt);
    }

    this.draw();

    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    this.gameTime += dt;

    // Update player
    this.player.update(dt, this);

    // Update player facing direction toward nearest enemy (for auto-aim visual)
    if (this.enemies.length > 0) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = this.player.distanceTo(enemy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = enemy;
        }
      }
      if (nearest && !Input.isMoving()) {
        // Only face enemy if not moving
        this.player.facingAngle = this.player.angleTo(nearest);
      }
    }

    // Update camera
    Camera.follow(this.player.x, this.player.y, dt);

    // Update weapon system (auto-fire)
    WeaponSystem.update(dt, this);

    // Update spawner
    Spawner.update(dt, this);

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this);

      // Remove dead enemies
      if (!enemy.alive) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Check contact damage with player
      if (this.player.alive) {
        enemy.checkContactDamage(this.player, this);
      }

      // Despawn enemies that are too far from player
      if (Utils.distance(this.player.x, this.player.y, enemy.x, enemy.y) > 1200) {
        this.enemies.splice(i, 1);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, this);

      if (!proj.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (const enemy of this.enemies) {
        if (!enemy.alive || proj.hasHit(enemy)) continue;

        if (proj.collidesWith(enemy)) {
          const knockbackAngle = Utils.angle(this.player.x, this.player.y, enemy.x, enemy.y);
          enemy.takeDamage(proj.damage, knockbackAngle, proj.knockback, this);

          // Damage number
          this.particles.spawnText(
            enemy.x + Utils.randomRange(-10, 10),
            enemy.y - 20,
            Math.round(proj.damage).toString(),
            '#ff4444'
          );

          proj.onHitEnemy(enemy, this);

          // Blood Bolt lifesteal effect
          if (proj.type === 'bloodBolt') {
            const healAmount = Math.ceil(proj.damage * 0.05);
            this.player.heal(healAmount);
            // Small green number for heal
            this.particles.spawnText(
              this.player.x + Utils.randomRange(-5, 5),
              this.player.y - 25,
              `+${healAmount}`,
              '#22cc44'
            );
          }

          if (!proj.alive) break;
        }
      }
    }

    // Update XP gems
    this.xpGems.update(dt, this);

    // Update ghost orbs
    GhostOrbSystem.update(dt, this);

    // Update particles
    this.particles.update(dt);

    // Check game over
    if (!this.player.alive) {
      this.onGameOver();
    }
  }

  addXP(amount) {
    Leveling.addXP(amount, this);
  }

  onGameOver() {
    this.gameOver = true;

    // Show game over screen
    const gameOverScreen = document.getElementById('game-over-screen');
    document.getElementById('finalLevel').textContent = Leveling.level;
    document.getElementById('finalKills').textContent = this.kills;
    document.getElementById('finalTime').textContent = Utils.formatTime(this.gameTime);
    gameOverScreen.classList.remove('hidden');
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Draw background grid
    this.drawBackground(ctx);

    // Draw XP gems
    this.xpGems.draw(ctx);

    // Draw ghost orbs
    GhostOrbSystem.draw(ctx);

    // Draw enemies
    for (const enemy of this.enemies) {
      if (Camera.isOnScreen(enemy.x, enemy.y, 100)) {
        enemy.draw(ctx);
      }
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      if (Camera.isOnScreen(proj.x, proj.y, 50)) {
        proj.draw(ctx);
      }
    }

    // Draw weapon effects
    WeaponSystem.draw(ctx, this);

    // Draw player
    if (this.player.alive) {
      this.player.draw(ctx);
    }

    // Draw particles (on top of everything)
    this.particles.draw(ctx);

    // Draw HUD
    HUD.draw(ctx, this);

    // Grayed-out death screen overlay
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawBackground(ctx) {
    const bounds = Camera.getBounds();
    const gridSize = this.gridSize;

    // Calculate grid start
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const startY = Math.floor(bounds.top / gridSize) * gridSize;

    ctx.strokeStyle = '#151528';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = startX; x <= bounds.right; x += gridSize) {
      const screen = Camera.worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, this.canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= bounds.bottom; y += gridSize) {
      const screen = Camera.worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(this.canvas.width, screen.y);
      ctx.stroke();
    }

    // Subtle radial vignette
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 100,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
