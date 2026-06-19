// Main entry point
(function() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  const pauseScreen = document.getElementById('pause-screen');

  function syncPauseScreen() {
    if (game.paused && game.pauseReason === 'manual') {
      pauseScreen.classList.remove('hidden');
    } else {
      pauseScreen.classList.add('hidden');
    }
  }

  // Initialize
  game.init();

  // Start button
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    pauseScreen.classList.add('hidden');
    game.start();
  });

  // Restart button
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    pauseScreen.classList.add('hidden');
    game.start();
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    game.resume('manual');
    syncPauseScreen();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyP' && e.code !== 'Escape') return;
    if (!game.running || game.gameOver || game.pauseReason === 'weaponSelect') return;
    game.togglePause();
    syncPauseScreen();
  });

  // Prevent context menu on canvas
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
})();
