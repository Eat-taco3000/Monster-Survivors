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

    // Visual feedback
    game.particles.spawnBurst(player.x, player.y, '#ffdd00', 15);
    game.particles.spawnBurst(player.x, player.y, '#ffffff', 10);
    game.particles.spawnText(player.x, player.y - 30, `LEVEL ${this.level}!`, '#ffdd00');

    // Show weapon selection UI on level up
    this.showWeaponSelection(game);
  },

  getXPProgress() {
    return this.xp / this.xpToNext;
  },

  // Weapons known in the game. Update this list when adding new weapon types.
  knownWeapons() {
    return ['bloodBolt', 'fireWand', 'iceStaff'];
  },

  // UI: present choices to the player to level or take a weapon
  showWeaponSelection(game) {
    const modal = document.getElementById('weapon-select-modal');
    const list = document.getElementById('weapon-options');
    const skipBtn = document.getElementById('weapon-skip-btn');
    list.innerHTML = '';

    const playerWeapons = WeaponSystem.weapons.map(w => w.type);

    // Build option entries
    const known = this.knownWeapons();
    for (const type of known) {
      const wTemplate = WeaponSystem.createWeapon(type);
      if (!wTemplate) continue;
      const owned = playerWeapons.includes(type);
      // Find actual instance if owned
      const ownedInstance = owned ? WeaponSystem.weapons.find(w => w.type === type) : null;

      const div = document.createElement('div');
      div.className = 'weapon-option';
      const left = document.createElement('div');
      left.className = 'left';
      const icon = document.createElement('div');
      icon.className = 'weapon-icon';
      icon.style.background = wTemplate.color;
      icon.style.boxShadow = `0 0 8px ${wTemplate.glowColor || '#ffffff66'}`;
      const desc = document.createElement('div');
      desc.className = 'desc';
      const title = document.createElement('div');
      title.textContent = wTemplate.name;
      title.style.fontWeight = '700';
      const subtitle = document.createElement('div');
      subtitle.style.fontSize = '12px';
      subtitle.style.color = '#a8a8b8';
      if (owned) {
        subtitle.textContent = `Level ${ownedInstance.level} — ${ownedInstance.name}`;
      } else {
        subtitle.textContent = 'New weapon';
      }
      desc.appendChild(title);
      desc.appendChild(subtitle);
      left.appendChild(icon);
      left.appendChild(desc);

      const btn = document.createElement('button');
      if (owned) {
        btn.className = 'btn-level';
        btn.textContent = `Level ${ownedInstance.level + 1}`;
        btn.onclick = () => {
          WeaponSystem.levelUp(ownedInstance);
          closeModal();
          // small feedback
          game.particles.spawnText(game.player.x, game.player.y - 26, `${ownedInstance.name} +1`, '#66d0ff');
        };
      } else {
        btn.className = 'btn-get';
        btn.textContent = 'Get';
        btn.onclick = () => {
          WeaponSystem.addWeapon(type);
          closeModal();
          game.particles.spawnText(game.player.x, game.player.y - 26, `${wTemplate.name} acquired`, '#ffd86b');
        };
      }

      div.appendChild(left);
      div.appendChild(btn);
      list.appendChild(div);
    }

    // Skip button action
    skipBtn.onclick = () => {
      closeModal();
    };

    function closeModal() {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
};
