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
      case 'fireWand':
        // Fire Wand: spawns an explosion at the target that deals AoE damage
        return {
          type: 'fireWand',
          name: 'Fire Wand',
          cooldown: 0,
          baseCooldown: 1.0,
          damage: 12,
          aoeRadius: 60,
          lifetime: 0.35,
          level: 1,
          maxLevel: 8,
          color: '#ff7a00',
          glowColor: '#ffb244'
        };
      case 'iceStaff':
        // Ice Staff: an activated ability (press E) that creates a slow/damage field around player
        return {
          type: 'iceStaff',
          name: 'Ice Staff',
          // Ability properties
          abilityCooldown: 5.0,              // seconds between uses
          abilityCooldownRemaining: 0,       // runtime remaining cooldown
          abilityDuration: 4.0,              // how long the slow field persists
          abilityTickInterval: 0.5,          // damage tick interval
          abilityDamagePerTick: 6,           // damage per tick to enemies inside field
          abilityRadius: 100,                // radius of the slow field
          slowFactor: 0.6,                   // enemies are slowed to 60% speed
          slowDuration: 2.0,                 // slow lasts this long on enemies
          level: 1,
          maxLevel: 8,
          color: '#66ddff',
          glowColor: '#99eeff'
        };
      default:
        return null;
    }
  },

  update(dt, game) {
    for (const weapon of this.weapons) {
      // weapon base cooldowns for auto-fire
      weapon.cooldown -= dt;
      // ability cooldowns
      if (typeof weapon.abilityCooldownRemaining === 'number') {
        weapon.abilityCooldownRemaining = Math.max(0, weapon.abilityCooldownRemaining - dt);
      }

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

    const player = game.player;

    if (weapon.type === 'fireWand') {
      const targets = this.findTargets(weapon, game);
      if (targets.length === 0) return;
      const target = targets[0];

      // Sanitize numeric fields (prevents NaN/Infinity causing exceptions)
      const baseAoe = Number(weapon.aoeRadius) || 0;
      const baseDmg = Number(weapon.damage) || 0;
      const lvl = Number(weapon.level) || 1;

      // Clamp to reasonable ranges
      const aoe = Math.max(8, Math.min(400, baseAoe + (lvl - 1) * 8));
      const dmg = Math.max(1, Math.min(10000, baseDmg + (lvl - 1) * 4));
      const life = Number(weapon.lifetime) || 0.25;

      const ex = new Explosion(
        target.x,
        target.y,
        aoe,
        dmg,
        life,
        { color: weapon.color, glow: weapon.glowColor, source: game.player }
      );

      game.projectiles.push(ex);

      // Visual and particle feedback
      game.particles.spawnBurst(target.x, target.y, weapon.color, 10);
      game.particles.spawnBurst(target.x, target.y, '#ffffff', 6);
      return;
    }

    // Default projectile weapons (bloodBolt etc.)
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
    const count = Math.min(weapon.projectileCount || 1, sorted.length);
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
      case 'fireWand':
        if (weapon.level === 2) { weapon.damage += 3; weapon.aoeRadius += 6; weapon.baseCooldown *= 0.95; }
        else if (weapon.level === 3) { weapon.aoeRadius += 8; weapon.damage += 4; }
        else if (weapon.level === 4) { weapon.baseCooldown *= 0.95; weapon.damage += 5; }
        else if (weapon.level === 5) { weapon.aoeRadius += 12; weapon.damage += 6; }
        else if (weapon.level === 6) { weapon.baseCooldown *= 0.9; weapon.damage += 8; }
        else if (weapon.level === 7) { weapon.aoeRadius += 16; weapon.damage += 10; }
        else if (weapon.level === 8) { weapon.damage += 16; weapon.aoeRadius += 22; weapon.baseCooldown *= 0.85; }
        break;
      case 'iceStaff':
        // Ice staff ability scales
        if (weapon.level === 2) { weapon.abilityDamagePerTick += 2; weapon.abilityRadius += 8; }
        else if (weapon.level === 3) { weapon.abilityDamagePerTick += 2; weapon.abilityRadius += 10; }
        else if (weapon.level === 4) { weapon.abilityDuration += 0.5; weapon.abilityDamagePerTick += 3; }
        else if (weapon.level === 5) { weapon.abilityDamagePerTick += 4; weapon.abilityRadius += 12; }
        else if (weapon.level === 6) { weapon.abilityCooldown = Math.max(0.5, weapon.abilityCooldown - 0.4); weapon.abilityDamagePerTick += 5; }
        else if (weapon.level === 7) { weapon.abilityDuration += 1.0; weapon.abilityDamagePerTick += 6; }
        else if (weapon.level === 8) { weapon.abilityDamagePerTick += 10; weapon.abilityRadius += 18; weapon.abilityCooldown = Math.max(0.3, weapon.abilityCooldown - 0.6); }
        break;
    }

    // Sanitize numeric properties to avoid NaN/Infinity
    weapon.baseCooldown = Math.max(0.05, Number(weapon.baseCooldown) || 0.05);
    weapon.damage = Math.max(0, Number(weapon.damage) || 0);
    weapon.aoeRadius = Math.max(0, Number(weapon.aoeRadius) || 0);
    weapon.abilityCooldown = Math.max(0, Number(weapon.abilityCooldown) || 0);
    weapon.abilityDuration = Math.max(0, Number(weapon.abilityDuration) || 0);
    weapon.abilityDamagePerTick = Math.max(0, Number(weapon.abilityDamagePerTick) || 0);
    weapon.abilityTickInterval = Math.max(0.1, Number(weapon.abilityTickInterval) || 0.5);
    weapon.abilityRadius = Math.max(0, Number(weapon.abilityRadius) || 0);
    weapon.level = Math.min(weapon.maxLevel || 8, Math.max(1, Number(weapon.level) || 1));

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
      } else if (weapon.type === 'fireWand') {
        // Subtle orange glow
        const screen = Camera.worldToScreen(game.player.x, game.player.y);
        const pulse = Math.sin(performance.now() / 300) * 0.08 + 0.12;
        ctx.save();
        ctx.globalAlpha = pulse;
        const gradient = ctx.createRadialGradient(screen.x, screen.y, 8, screen.x, screen.y, 40);
        gradient.addColorStop(0, weapon.color + '33');
        gradient.addColorStop(1, '#00000000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (weapon.type === 'iceStaff') {
        // Subtle icy glow
        const screen = Camera.worldToScreen(game.player.x, game.player.y);
        const pulse = Math.sin(performance.now() / 250) * 0.06 + 0.1;
        ctx.save();
        ctx.globalAlpha = pulse;
        const gradient = ctx.createRadialGradient(screen.x, screen.y, 6, screen.x, screen.y, 48);
        gradient.addColorStop(0, weapon.color + '22');
        gradient.addColorStop(1, '#00000000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
};
