// Input handler - tracks keyboard state for 8-directional movement
const Input = {
  keys: {},
  keysPressed: {},

  init() {
    window.addEventListener('keydown', (e) => {
      // Record key down state
      this.keys[e.code] = true;
      this.keysPressed[e.code] = true; // used for edge-triggered inputs

      // Prevent default for game keys
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Reset on blur
    window.addEventListener('blur', () => {
      this.keys = {};
      this.keysPressed = {};
    });
  },

  // Consume a keypress (edge-triggered). Returns true once per keydown.
  consumeKey(code) {
    const pressed = !!this.keysPressed[code];
    if (pressed) this.keysPressed[code] = false;
    return pressed;
  },

  // Get movement vector (8-directional)
  getMovement() {
    let dx = 0;
    let dy = 0;

    // Up
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    // Down
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    // Left
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    // Right
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    // Normalize diagonal movement so it's not faster
    if (dx !== 0 && dy !== 0) {
      const norm = Utils.normalize(dx, dy);
      return { x: norm.x, y: norm.y };
    }

    return { x: dx, y: dy };
  },

  isMoving() {
    const m = this.getMovement();
    return m.x !== 0 || m.y !== 0;
  }
};
