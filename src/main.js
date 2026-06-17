// Main entry point
(function() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  // Initialize
  game.init();

  // Start button
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    game.start();
  });

  // Restart button
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    game.start();
  });

  // Prevent context menu on canvas
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
})();
