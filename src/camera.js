// Camera system - follows the player
const Camera = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  smoothing: 0.1,

  init(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
  },

  // Follow a target (player)
  follow(targetX, targetY, dt) {
    const targetCamX = targetX - this.width / 2;
    const targetCamY = targetY - this.height / 2;
    this.x = Utils.lerp(this.x, targetCamX, this.smoothing);
    this.y = Utils.lerp(this.y, targetCamY, this.smoothing);
  },

  // Convert world coords to screen coords
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  },

  // Convert screen coords to world coords
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    };
  },

  // Check if a world position is on screen (with margin)
  isOnScreen(worldX, worldY, margin = 100) {
    const screen = this.worldToScreen(worldX, worldY);
    return screen.x >= -margin && screen.x <= this.width + margin &&
           screen.y >= -margin && screen.y <= this.height + margin;
  },

  // Get the visible world bounds
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  },

  // Reset camera position
  reset(x, y) {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
  }
};
