// Base entity class
class Entity {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius || 16;
    this.alive = true;
    this.flashTimer = 0; // For hit flash effect
  }

  update(dt) {
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  draw(ctx) {
    // Override in subclasses
  }

  // Check collision with another entity (circle collision)
  collidesWith(other) {
    return Utils.distance(this.x, this.y, other.x, other.y) < this.radius + other.radius;
  }

  // Get distance to another entity
  distanceTo(other) {
    return Utils.distance(this.x, this.y, other.x, other.y);
  }

  // Get angle to another entity
  angleTo(other) {
    return Utils.angle(this.x, this.y, other.x, other.y);
  }
}
