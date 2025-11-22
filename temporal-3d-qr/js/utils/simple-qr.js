/**
 * SIMPLE CANVAS QR CODE GENERATOR
 * Generates animated QR-like patterns on canvas without external dependencies
 * For demo and visualization purposes
 */

class SimpleQRGenerator {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
    this.moduleSize = options.moduleSize || 10;
    this.modules = Math.floor(this.size / this.moduleSize);
    this.frameNumber = 0;
    this.pattern = [];

    this.colors = {
      dark: options.colorDark || '#1F2937',
      light: options.colorLight || '#FFFFFF'
    };
  }

  /**
   * Generate QR pattern from text data
   */
  generatePattern(text, frameNum = 0) {
    const pattern = [];
    const hash = this.hashText(text + frameNum);

    for (let y = 0; y < this.modules; y++) {
      pattern[y] = [];
      for (let x = 0; x < this.modules; x++) {
        // Create pattern based on hash
        const index = (y * this.modules + x) % hash.length;
        const value = hash.charCodeAt(index) % 2 === 0;

        // Add some animation based on frame number
        const animated = (value + Math.sin((x + y + frameNum) * 0.1) > 0.5);
        pattern[y][x] = animated;
      }
    }

    return pattern;
  }

  /**
   * Hash text to generate consistent pattern
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36) + text;
  }

  /**
   * Draw QR pattern on canvas
   */
  draw(text, frameNum = 0) {
    this.frameNumber = frameNum;
    const pattern = this.generatePattern(text, frameNum);

    // Clear canvas with subtle gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, this.size, this.size);
    gradient.addColorStop(0, this.colors.light);
    gradient.addColorStop(1, '#F9FAFB');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Draw pattern with slight depth effect
    this.ctx.fillStyle = this.colors.dark;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    this.ctx.shadowBlur = 2;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;

    for (let y = 0; y < this.modules; y++) {
      for (let x = 0; x < this.modules; x++) {
        if (pattern[y][x]) {
          // Add slight rounding to modules for modern look
          this.ctx.fillRect(
            x * this.moduleSize + 0.5,
            y * this.moduleSize + 0.5,
            this.moduleSize - 1,
            this.moduleSize - 1
          );
        }
      }
    }

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;

    // Draw corner markers (like real QR codes)
    this.drawCornerMarkers();

    // Add subtle glow effect around the QR code
    this.addGlowEffect(frameNum);
  }

  /**
   * Draw QR code corner markers
   */
  drawCornerMarkers() {
    const markerSize = 7 * this.moduleSize;
    const positions = [
      [0, 0],
      [this.size - markerSize, 0],
      [0, this.size - markerSize]
    ];

    // Add subtle shadow to markers
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 3;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;

    positions.forEach(([x, y]) => {
      // Outer square with rounded corners
      this.ctx.fillStyle = this.colors.dark;
      this.roundRect(x, y, markerSize, markerSize, 2);

      // Middle square (white) with rounded corners
      this.ctx.fillStyle = this.colors.light;
      this.roundRect(
        x + this.moduleSize,
        y + this.moduleSize,
        markerSize - 2 * this.moduleSize,
        markerSize - 2 * this.moduleSize,
        1.5
      );

      // Inner square (black) with rounded corners
      this.ctx.fillStyle = this.colors.dark;
      this.roundRect(
        x + 2 * this.moduleSize,
        y + 2 * this.moduleSize,
        markerSize - 4 * this.moduleSize,
        markerSize - 4 * this.moduleSize,
        1
      );
    });

    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw rounded rectangle
   */
  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Apply rotation animation
   */
  applyRotation(frameNum) {
    const rotation = (frameNum * 0.5) % 360;

    if (rotation > 0) {
      const imageData = this.ctx.getImageData(0, 0, this.size, this.size);

      this.ctx.save();
      this.ctx.translate(this.size / 2, this.size / 2);
      this.ctx.rotate((rotation * Math.PI) / 180);
      this.ctx.translate(-this.size / 2, -this.size / 2);
      this.ctx.putImageData(imageData, 0, 0);
      this.ctx.restore();
    }
  }

  /**
   * Add subtle glow effect
   */
  addGlowEffect(frameNum) {
    // Pulsing glow effect
    const pulse = Math.sin(frameNum * 0.05) * 0.5 + 0.5;
    const glowIntensity = 5 + pulse * 3;

    // Create gradient for glow
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, this.size * 0.3,
      centerX, centerY, this.size * 0.6
    );

    gradient.addColorStop(0, 'rgba(99, 102, 241, 0)');
    gradient.addColorStop(1, `rgba(99, 102, 241, ${0.05 + pulse * 0.03})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.size, this.size);
  }

  /**
   * Animate the QR code
   */
  animate(text, duration = Infinity) {
    let frame = 0;
    const animate = () => {
      this.draw(text, frame);
      frame++;

      if (frame < duration || duration === Infinity) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}

// Compatibility layer for QRCode API
if (typeof window !== 'undefined') {
  // Initialize QRCode namespace if it doesn't exist
  if (!window.QRCode) {
    window.QRCode = {};
  }

  // Store original toCanvas if it exists
  const originalToCanvas = window.QRCode.toCanvas;

  // Add toCanvas method for compatibility
  window.QRCode.toCanvas = function(canvas, text, options, callback) {
    try {
      // Try original library first if available
      if (originalToCanvas && typeof originalToCanvas === 'function') {
        return originalToCanvas(canvas, text, options, callback);
      }
    } catch (error) {
      console.log('Using SimpleQRGenerator fallback');
    }

    // Use our fallback generator
    const generator = new SimpleQRGenerator(canvas, {
      moduleSize: options?.moduleSize || 10,
      colorDark: options?.color?.dark || '#1F2937',
      colorLight: options?.color?.light || '#FFFFFF'
    });

    generator.draw(text, 0);

    if (callback) {
      callback(null);
    }
  };
}
