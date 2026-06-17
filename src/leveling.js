// Leveling system
const Leveling = {
  level: 1,
  xp: 0,
  xpToNext: 5,
  totalXP: 0,

  // XP thresholds: 5, 7, 10, 15, 22, 33, 49, ...
  // Formula: next = current + floor(current / 2)
  xpThresholds: [5],

  getXPForLevel(level) {
    // Ensure thresholds are computed up to this level
    while (this.xpThresholds.length < level) {
      const prev = this.xpThresholds[this.xpThresholds.length - 1];
      this.xpThresholds.push(prev + Math.floor(prev / 2));
    }
    return this.xpThresholds[level - 1];
  },

  init() {
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 5;
    this.totalXP = 0;
    this.xpThresholds = [5];
  },

  addXP(amount, game) {
    this.xp += amount;
    this.totalXP += amount;

    // Check for level up
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.getXPForLevel(this.level);
      this.onLevelUp(game);
    }
  },

  onLevelUp(game) {
    const player = game.player;

    // Stat increases on level up
    player.maxHealthBonus += 10;
    player.heal(20); // Heal some on level up
    player.damageMultiplier += 0.05;
    player.speedMultiplier += 0.02;
    player.armor += 0.5;

    // Level up Blood Bolt at certain levels
    if (this.level <= 8 && WeaponSystem.weapons.length > 0) {
      const bloodBolt = WeaponSystem.weapons.find(w => w.type === 'bloodBolt');
      if (bloodBolt && bloodBolt.level < this.level) {
        WeaponSystem.levelUp(bloodBolt);
      }
    }

    // Visual feedback
    game.particles.spawnBurst(player.x, player.y, '#ffdd00', 15);
    game.particles.spawnBurst(player.x, player.y, '#ffffff', 10);
    game.particles.spawnText(player.x, player.y - 30, `LEVEL ${this.level}!`, '#ffdd00');

    // Increase magnet range on level up (applied via gem system)
  },

  getXPProgress() {
    return this.xp / this.xpToNext;
  }
};
