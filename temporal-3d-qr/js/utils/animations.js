/**
 * ANIMATIONS UTILITIES MODULE
 * Reusable animation functions and effects
 */

const Animations = {
  /**
   * Fade in element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  fadeIn(element, duration = 300) {
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.display = 'block';

      const start = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        element.style.opacity = progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Fade out element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  fadeOut(element, duration = 300) {
    return new Promise((resolve) => {
      const start = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        element.style.opacity = 1 - progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Slide in element
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - Direction ('up', 'down', 'left', 'right')
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  slideIn(element, direction = 'up', duration = 400) {
    return new Promise((resolve) => {
      element.style.display = 'block';

      const start = performance.now();
      const distance = 50; // pixels

      const getTransform = (progress) => {
        const offset = distance * (1 - progress);
        switch (direction) {
          case 'up': return `translateY(${offset}px)`;
          case 'down': return `translateY(-${offset}px)`;
          case 'left': return `translateX(${offset}px)`;
          case 'right': return `translateX(-${offset}px)`;
          default: return 'translate(0)';
        }
      };

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        element.style.transform = getTransform(progress);
        element.style.opacity = progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.transform = 'translate(0)';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Bounce animation
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  bounce(element, duration = 600) {
    return new Promise((resolve) => {
      const start = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Bounce easing function
        const bounce = Math.abs(Math.sin(progress * Math.PI * 2)) * (1 - progress);
        const translateY = -bounce * 20;

        element.style.transform = `translateY(${translateY}px)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.transform = 'translateY(0)';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Pulse animation
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  pulse(element, duration = 800) {
    return new Promise((resolve) => {
      const start = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        const scale = 1 + Math.sin(progress * Math.PI) * 0.1;
        element.style.transform = `scale(${scale})`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.transform = 'scale(1)';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Shake animation
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  shake(element, duration = 500) {
    return new Promise((resolve) => {
      const start = performance.now();
      const intensity = 10;

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        const shake = Math.sin(progress * Math.PI * 8) * intensity * (1 - progress);
        element.style.transform = `translateX(${shake}px)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.transform = 'translateX(0)';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Rotate animation
   * @param {HTMLElement} element - Element to animate
   * @param {number} degrees - Degrees to rotate
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  rotate(element, degrees = 360, duration = 600) {
    return new Promise((resolve) => {
      const start = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        const rotation = degrees * progress;
        element.style.transform = `rotate(${rotation}deg)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Create confetti effect
   * @param {number} count - Number of confetti pieces
   * @param {number} duration - Duration in ms
   */
  confetti(count = 50, duration = 3000) {
    const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: ${5 + Math.random() * 10}px;
        height: ${5 + Math.random() * 10}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -20px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
      `;

      document.body.appendChild(confetti);

      const animationDuration = duration + Math.random() * 1000;
      const rotation = Math.random() * 720 - 360;
      const xMovement = (Math.random() - 0.5) * 200;

      confetti.animate([
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${xMovement}px, 100vh) rotate(${rotation}deg)`, opacity: 0 }
      ], {
        duration: animationDuration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      setTimeout(() => {
        document.body.removeChild(confetti);
      }, animationDuration);
    }
  },

  /**
   * Ripple effect
   * @param {HTMLElement} element - Element to create ripple from
   * @param {Event} event - Click event
   */
  ripple(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      transform: scale(0);
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    ripple.animate([
      { transform: 'scale(0)', opacity: 1 },
      { transform: 'scale(2)', opacity: 0 }
    ], {
      duration: 600,
      easing: 'ease-out'
    });

    setTimeout(() => {
      element.removeChild(ripple);
    }, 600);
  },

  /**
   * Number counter animation
   * @param {HTMLElement} element - Element containing number
   * @param {number} target - Target number
   * @param {number} duration - Duration in ms
   * @returns {Promise} - Resolves when complete
   */
  countUp(element, target, duration = 1000) {
    return new Promise((resolve) => {
      const start = parseInt(element.textContent) || 0;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (target - start) * progress);
        element.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.textContent = target;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
};

// Add global CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Animations;
}
