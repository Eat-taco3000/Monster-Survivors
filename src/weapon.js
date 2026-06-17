// Weapon system - Blood Bolt and future weapons
const WeaponSystem = {
  weapons: [],

  init() {
    this.weapons = [];
    // Start with Blood Bolt
    this.addWeapon('bloodBolt');
  },

  addWeapon(type) {
    const weapon = this.createWeapon(type);
    if (weapon) {
      this.weapons.push(weapon);
    }
  },

  createWeapon(type) {
    switch (type) {
      case 'bloodBolt':
        return {
          type: 'bloodBolt',
          name: 'Blood Bolt',
          cooldown: 0,
          baseCooldown: 0.8,
          damage: 15,
          speed: 350,
          projectileCount: 1,
          pierce: 1,
          homingStrength: 3,
          lifetime: 2.5,
          knockback: 100,
          level: 1,
          maxLevel: 8,
          color: '#cc0000',
          glowColor: '#ff2200'
        };
      default:
        return null;
    }
  },

  update(dt, game) {
    for (const weapon of this.weapons) {
      weapon.cooldown -= dt;
      if (weapon.cooldown <= 0) {
        // Don't fire if player is silenced
        if (!game.player.isSilenced) {
          this.fire(weapon, game);
        }
        weapon.cooldown = weapon.baseCooldown;
      }
    }
  },

  fire(weapon, game) {
    if (game.enemies.length === 0) return;

    // Find nearest enemies to target
    const player = game.player;
    const targets = this.findTargets(weapon, game);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const angle = player.angleTo(target);

      // Small spread for multiple projectiles
      const spreadAngle = weapon.projectileCount > 1
        ? angle + (i - (weapon.projectileCount - 1) / 2) * 0.2
        : angle;

      const proj = new Projectile(
        player.x + Math.cos(angle) * player.radius,
        player.y + Math.sin(angle) * player.radius,
        spreadAngle,
        weapon.speed,
        weapon.damage * player.damageMultiplier,
        {
          lifetime: weapon.lifetime,
          pierce: weapon.pierce,
          knockback: weapon.knockback,
          color: weapon.color,
          glowColor: weapon.glowColor,
          radius: 5 + weapon.level,
          trailLength: 10 + weapon.level * 2,
          homingStrength: weapon.homingStrength,
          type: weapon.type
        }
      );

      game.projectiles.push(proj);
    }

    // Muzzle flash particles
    game.particles.spawnBurst(
      player.x + Math.cos(player.facingAngle) * player.radius,
      player.y + Math.sin(player.facingAngle) * player.radius,
      weapon.color,
      3
    );
  },

  findTargets(weapon, game) {
    const player = game.player;
    // Sort enemies by distance
    const sorted = [...game.enemies]
      .filter(e => e.alive)
      .sort((a, b) => player.distanceTo(a) - player.distanceTo(b));

    // Target the closest enemies
    const count = Math.min(weapon.projectileCount, sorted.length);
    return sorted.slice(0, count);
  },

  // Level up a weapon
  levelUp(weapon) {
    if (weapon.level >= weapon.maxLevel) return false;

    weapon.level++;

    switch (weapon.type) {
      case 'bloodBolt':
        if (weapon.level === 2) { weapon.damage = 20; weapon.baseCooldown = 0.7; }
        else if (weapon.level === 3) { weapon.pierce = 2; weapon.damage = 22; }
        else if (weapon.level === 4) { weapon.projectileCount = 2; weapon.damage = 25; }
        else if (weapon.level === 5) { weapon.damage = 30; weapon.baseCooldown = 0.6; weapon.homingStrength = 4; }
        else if (weapon.level === 6) { weapon.pierce = 3; weapon.damage = 35; }
        else if (weapon.level === 7) { weapon.projectileCount = 3; weapon.damage = 40; weapon.baseCooldown = 0.5; }
        else if (weapon.level === 8) { weapon.damage = 50; weapon.pierce = 5; weapon.homingStrength = 6; }
        break;
    }
    return true;
  },

  draw(ctx, game) {
    // Any weapon visual effects (e.g., aura around player)
    for (const weapon of this.weapons) {
      if (weapon.type === 'bloodBolt') {
        // Subtle blood aura around player
        const screen = Camera.worldToScreen(game.player.x, game.player.y);
        const pulse = Math.sin(performance.now() / 300) * 0.1 + 0.15;
        ctx.save();
        ctx.globalAlpha = pulse;
        const gradient = ctx.createRadialGradient(screen.x, screen.y, 10, screen.x, screen.y, 35);
        gradient.addColorStop(0, '#cc000044');
        gradient.addColorStop(1, '#cc000000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
};
