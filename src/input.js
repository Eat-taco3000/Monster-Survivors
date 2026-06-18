// Input handler - tracks keyboard state for 8-directional movement and one-shot keys
const Input = {
  keys: {},       // current held state (true while down)
  pressed: {},    // edge/one-shot presses (set true once on keydown, cleared when consumed)

  init() {
    window.addEventListener('keydown', (e) => {
      // If key was not already held, mark as newly pressed (edge)
      if (!this.keys[e.code]) {
        this.pressed[e.code] = true;
      }
      this.keys[e.code] = true;

      // Prevent default for game keys (include KeyE)
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      // Clear pressed on keyup to avoid stale state if never consumed
      this.pressed[e.code] = false;
    });

    // Reset on blur
    window.addEventListener('blur', () => {
      this.keys = {};
      this.pressed = {};
    });
  },

  // Consume a one-shot key press. Returns true exactly once per physical press.
  consumeKey(code) {
    if (this.pressed[code]) {
      this.pressed[code] = false;
      return true;
    }
    return false;
  },

  // Direct check if a key is held down
  isKeyDown(code) {
    return !!this.keys[code];
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
