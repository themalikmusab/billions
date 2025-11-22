/**
 * TEMPORAL 3D QR CODE GENERATOR
 * Generates time-based QR codes with cryptographic challenge chains
 */

class TemporalQRGenerator {
  constructor(config = {}) {
    this.sessionId = config.sessionId || this.generateSessionId();
    this.frameRate = config.fps || 60;
    this.frameInterval = 1000 / this.frameRate;
    this.currentFrame = 0;
    this.challengeChain = [];
    this.startTime = Date.now();
    this.isRunning = false;
    this.pattern = config.pattern || 'rotation'; // rotation, wave, pulse
    this.size = config.size || 300;

    // Session metadata
    this.sessionData = {
      sessionName: config.sessionName || 'Demo Session',
      courseId: config.courseId || 'DEMO101',
      instructorId: config.instructorId || 'INSTRUCTOR1',
      startTime: this.startTime,
      validUntil: this.startTime + (2 * 60 * 60 * 1000) // 2 hours
    };

    // Callbacks
    this.onFrame = config.onFrame || null;
    this.onStart = config.onStart || null;
    this.onStop = config.onStop || null;
  }

  generateSessionId() {
    return 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate cryptographic challenge for current frame
   */
  generateChallenge(timestamp, frameNumber) {
    const previousHash = this.challengeChain[this.challengeChain.length - 1] || '0';

    // Combine previous hash + timestamp + frame + session for challenge
    const data = previousHash + timestamp + frameNumber + this.sessionId;

    // Simple hash function (in production, use Web Crypto API)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const challenge = Math.abs(hash).toString(36).substring(0, 16);
    this.challengeChain.push(challenge);

    return challenge;
  }

  /**
   * Generate pattern modifier for visual morphing
   */
  getPatternModifier(frameNumber) {
    switch(this.pattern) {
      case 'rotation':
        return {
          type: 'rotation',
          rotation: (frameNumber * 2) % 360,
          scale: 1
        };

      case 'wave':
        return {
          type: 'wave',
          rotation: 0,
          phase: Math.sin(frameNumber * 0.1) * 10
        };

      case 'pulse':
        return {
          type: 'pulse',
          rotation: 0,
          scale: 1 + Math.sin(frameNumber * 0.15) * 0.1
        };

      default:
        return { type: 'static', rotation: 0, scale: 1 };
    }
  }

  /**
   * Generate frame data
   */
  generateFrame() {
    const timestamp = Date.now();
    const frameNumber = this.currentFrame++;

    // Generate challenge
    const challenge = this.generateChallenge(timestamp, frameNumber);
    const previousHash = this.challengeChain[this.challengeChain.length - 2] || '0';

    // Pattern modifier
    const modifier = this.getPatternModifier(frameNumber);

    // Frame data structure
    const frameData = {
      // Layer 1: Session metadata
      session: this.sessionId,
      sessionName: this.sessionData.sessionName,

      // Layer 2: Temporal markers
      t: timestamp,
      f: frameNumber,

      // Layer 3: Cryptographic binding
      c: challenge,
      p: previousHash.substring(0, 8),

      // Layer 4: Visual pattern
      m: modifier,

      // Layer 5: Offline support
      offline: {
        validFrom: this.sessionData.startTime,
        validUntil: this.sessionData.validUntil,
        courseId: this.sessionData.courseId
      }
    };

    return frameData;
  }

  /**
   * Encode frame data to QR-compatible string
   */
  encodeFrameData(frameData) {
    // Create compact JSON representation
    const compact = {
      s: frameData.session,
      t: frameData.t,
      f: frameData.f,
      c: frameData.c,
      p: frameData.p,
      r: frameData.m.rotation || 0
    };

    return JSON.stringify(compact);
  }

  /**
   * Start generating frames
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.currentFrame = 0;
    this.challengeChain = [];
    this.startTime = Date.now();

    if (this.onStart) {
      this.onStart(this.sessionData);
    }

    this._startRenderLoop();
  }

  /**
   * Internal render loop
   */
  _startRenderLoop() {
    const tick = () => {
      if (!this.isRunning) return;

      const frameData = this.generateFrame();
      const qrText = this.encodeFrameData(frameData);

      if (this.onFrame) {
        this.onFrame(frameData, qrText);
      }

      // Schedule next frame
      setTimeout(tick, this.frameInterval);
    };

    tick();
  }

  /**
   * Stop generating frames
   */
  stop() {
    this.isRunning = false;

    if (this.onStop) {
      this.onStop({
        totalFrames: this.currentFrame,
        duration: Date.now() - this.startTime,
        avgFps: this.currentFrame / ((Date.now() - this.startTime) / 1000)
      });
    }
  }

  /**
   * Pause generation
   */
  pause() {
    this.isRunning = false;
  }

  /**
   * Resume generation
   */
  resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._startRenderLoop();
  }

  /**
   * Get current statistics
   */
  getStats() {
    const runtime = Date.now() - this.startTime;
    const avgFps = this.currentFrame / (runtime / 1000);

    return {
      sessionId: this.sessionId,
      currentFrame: this.currentFrame,
      runtime: runtime,
      avgFps: avgFps.toFixed(2),
      challengeChainLength: this.challengeChain.length,
      isRunning: this.isRunning
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemporalQRGenerator;
}
