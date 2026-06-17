// HUD (Heads Up Display) - draws UI elements
const HUD = {
  draw(ctx, game) {
    const player = game.player;
    const canvasWidth = ctx.canvas.width;
    const padding = 15;

    ctx.save();

    // --- TOP LEFT: Health Bar ---
    const hpBarWidth = 200;
    const hpBarHeight = 16;
    const hpX = padding;
    const hpY = padding;

    // Health bar background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(hpX, hpY, hpBarWidth, hpBarHeight);

    // Health bar fill
    const hpPercent = player.health / player.effectiveMaxHealth;
    const hpColor = hpPercent > 0.5 ? '#22cc44' : hpPercent > 0.25 ? '#ccaa00' : '#cc2200';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpBarWidth * hpPercent, hpBarHeight);

    // Health bar border
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpBarWidth, hpBarHeight);

    // Health text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.ceil(player.health)} / ${player.effectiveMaxHealth}`,
      hpX + hpBarWidth / 2,
      hpY + hpBarHeight - 3
    );

    // --- XP Bar ---
    const xpBarY = hpY + hpBarHeight + 6;
    const xpPercent = Leveling.getXPProgress();

    // XP bar background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(hpX, xpBarY, hpBarWidth, 10);

    // XP bar fill
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(hpX, xpBarY, hpBarWidth * xpPercent, 10);

    // XP bar border
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, xpBarY, hpBarWidth, 10);

    // XP text
    ctx.fillStyle = '#aabbdd';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Leveling.xp} / ${Leveling.xpToNext} XP`,
      hpX + hpBarWidth / 2,
      xpBarY + 8
    );

    // --- Level Badge ---
    const badgeX = hpX + hpBarWidth + 12;
    const badgeY = padding + 12;
    const badgeRadius = 16;

    // Badge background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Level number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Leveling.level}`, badgeX, badgeY);
    ctx.textBaseline = 'alphabetic';

    // --- TOP RIGHT: Timer and Info ---
    ctx.textAlign = 'right';
    ctx.fillStyle = '#888888';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(Utils.formatTime(game.gameTime), canvasWidth - padding, padding + 14);

    // Difficulty
    ctx.fillStyle = '#666666';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText(Spawner.getDifficultyName(), canvasWidth - padding, padding + 30);

    // Kill count
    ctx.fillStyle = '#cc4444';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText(`Kills: ${game.kills}`, canvasWidth - padding, padding + 46);

    // --- SILENCE INDICATOR ---
    if (player.isSilenced) {
      const silenceAlpha = Math.sin(performance.now() / 150) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = silenceAlpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aa44ff';
      ctx.fillText('⚡ SILENCED', canvasWidth / 2, padding + 20);
      // Silence duration bar
      const barW = 120;
      const barX = canvasWidth / 2 - barW / 2;
      const barY = padding + 25;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#330055';
      ctx.fillRect(barX, barY, barW, 6);
      ctx.globalAlpha = silenceAlpha;
      ctx.fillStyle = '#aa44ff';
      const silenceProgress = player.silenceTimer / player.silenceDuration;
      ctx.fillRect(barX, barY, barW * silenceProgress, 6);
      ctx.restore();
    }

    // --- BOTTOM LEFT: Weapon Info ---
    const weaponY = ctx.canvas.height - padding - 10;
    ctx.textAlign = 'left';

    for (let i = 0; i < WeaponSystem.weapons.length; i++) {
      const weapon = WeaponSystem.weapons[i];
      const wy = weaponY - i * 25;

      // Weapon icon/background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(padding, wy - 16, 220, 20);

      // Weapon name and level
      ctx.fillStyle = weapon.color;
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillText(`⚔ ${weapon.name}`, padding + 5, wy - 3);

      ctx.fillStyle = '#888888';
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Lv.${weapon.level}`, padding + 195, wy - 3);
      ctx.textAlign = 'left';

      // Extra info per weapon type
      ctx.fillStyle = '#a8a8a8';
      ctx.font = '9px "Segoe UI", sans-serif';
      if (weapon.type === 'fireWand') {
        const aoe = isFinite(Number(weapon.aoeRadius)) ? Math.round(Number(weapon.aoeRadius)) : '--';
        const cd = isFinite(Number(weapon.baseCooldown)) ? Number(weapon.baseCooldown).toFixed(2) : '--';
        ctx.fillText(`AoE: ${aoe} | CD: ${cd}s`, padding + 6, wy + 10);
      } else if (weapon.type === 'bloodBolt') {
        ctx.fillText(`Dmg: ${Math.round(weapon.damage)} | Pierce: ${weapon.pierce}`, padding + 6, wy + 10);
      }
    }

    // --- BOTTOM RIGHT: Controls hint (first 10 seconds) ---
    if (game.gameTime < 10) {
      const alpha = Math.max(0, 1 - game.gameTime / 10);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#666666';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText('WASD / Arrow Keys to move', canvasWidth / 2, ctx.canvas.height - 30);
      ctx.fillText('Weapons fire automatically', canvasWidth / 2, ctx.canvas.height - 14);
    }

    ctx.restore();
  }
};
