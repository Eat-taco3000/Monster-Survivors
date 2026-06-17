// Utility functions
const Utils = {
  // Distance between two points
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Angle from point 1 to point 2 in radians
  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  // Normalize a vector
  normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  // Lerp
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Random float in range
  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  },

  // Random int in range (inclusive min, exclusive max)
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  // Clamp value
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // Random element from array
  randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Format time as M:SS
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};
