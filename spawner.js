// Enemy spawner system
const Spawner = {
  spawnTimer: 0,
  spawnInterval: 2.0,
  minSpawnInterval: 0.3,
  difficultyTimer: 0,
  spawnCount: 1,
  difficultyMultiplier: 1,
  maxEnemies: 200,

  init() {
    this.spawnTimer = 0;
    this.spawnInterval = 2.0;
    this.minSpawnInterval = 0.3;
    this.difficultyTimer = 0;
    this.spawnCount = 1;
    this.difficultyMultiplier = 1;
    this.maxEnemies = 200;
  },

  update(dt, game) {
    this.difficultyTimer += dt;

    const difficultyLevel = Math.floor(this.difficultyTimer / 10);
    this.difficultyMultiplier = 1 + difficultyLevel * 0.2;
    this.spawnInterval = Math.max(this.minSpawnInterval, 2.0 - difficultyLevel * 0.15);
    this.spawnCount = 1 + Math.floor(difficultyLevel / 2);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave(game);
      this.spawnTimer = this.spawnInterval;
    }
  },

  spawnWave(game) {
    for (let i = 0; i < this.spawnCount; i++) {
      if (!this.canSpawnMore(game)) return;
      this.spawnEnemy(game);
    }
  },

  getAliveEnemyCount(game) {
    return game.enemies.filter(enemy => enemy.alive).length;
  },

  canSpawnMore(game) {
    return this.getAliveEnemyCount(game) < this.maxEnemies;
  },

  addEnemy(game, enemy) {
    if (!this.canSpawnMore(game)) return false;
    game.enemies.push(enemy);
    return true;
  },

  // Pick which enemy type to spawn based on elapsed time
  pickEnemyType() {
    const t = this.difficultyTimer;

    // Build a weighted pool based on time
    const pool = [];

    // Vampires always present
    pool.push('vampire', 'vampire', 'vampire');

    // Zombies after 30s
    if (t > 30) pool.push('zombie', 'zombie');

    // Werewolves after 60s
    if (t > 60) pool.push('werewolf', 'werewolf');

    // Ghosts after 90s
    if (t > 90) pool.push('ghost');

    // Bats after 120s
    if (t > 120) pool.push('bat', 'bat');

    // Later on, reduce vampires and increase variety
    if (t > 180) {
      pool.push('ghost', 'bat', 'werewolf');
    }

    return pool[Math.floor(Math.random() * pool.length)];
  },

  spawnEnemy(game) {
    const player = game.player;
    if (!player || !this.canSpawnMore(game)) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = Utils.randomRange(500, 700);
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;

    const type = this.pickEnemyType();

    if (type === 'zombie') {
      // Zombies always spawn in a group of 3
      for (let i = 0; i < 3; i++) {
        if (!this.canSpawnMore(game)) break;
        const offsetAngle = angle + Utils.randomRange(-0.3, 0.3);
        const offsetDist = Utils.randomRange(-40, 40);
        const zx = x + Math.cos(offsetAngle + Math.PI / 2) * offsetDist;
        const zy = y + Math.sin(offsetAngle + Math.PI / 2) * offsetDist;
        this.addEnemy(game, EnemyFactory.createZombie(zx, zy, this.difficultyMultiplier));
      }
    } else if (type === 'werewolf') {
      this.addEnemy(game, EnemyFactory.createWerewolf(x, y, this.difficultyMultiplier));
    } else if (type === 'ghost') {
      this.addEnemy(game, EnemyFactory.createGhost(x, y, this.difficultyMultiplier));
    } else if (type === 'bat') {
      // Bats spawn in pairs
      this.addEnemy(game, EnemyFactory.createBat(x, y, this.difficultyMultiplier));
      const bx = x + Utils.randomRange(-30, 30);
      const by = y + Utils.randomRange(-30, 30);
      this.addEnemy(game, EnemyFactory.createBat(bx, by, this.difficultyMultiplier));
    } else {
      this.addEnemy(game, EnemyFactory.createVampire(x, y, this.difficultyMultiplier));
    }
  },

  getDifficultyName() {
    const level = Math.floor(this.difficultyTimer / 45);
    if (level < 1) return 'Easy';
    if (level < 3) return 'Medium';
    if (level < 5) return 'Hard';
    if (level < 8) return 'Insane';
    return 'Nightmare';
  }
};
