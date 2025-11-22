/**
 * FRAME CAPTURE MODULE
 * Captures and analyzes QR code frames from video stream
 */

class FrameCaptureManager {
  constructor(config = {}) {
    this.webcam = config.webcam || null;
    this.targetFrames = config.targetFrames || 5;
    this.captureInterval = config.captureInterval || 60; // ms between captures
    this.maxCaptureTime = config.maxCaptureTime || 5000; // max 5 seconds

    this.capturedFrames = [];
    this.isCapturing = false;
    this.captureStartTime = 0;

    // Callbacks
    this.onFrameCaptured = config.onFrameCaptured || null;
    this.onComplete = config.onComplete || null;
    this.onProgress = config.onProgress || null;
    this.onError = config.onError || null;
  }

  /**
   * Start capturing frames
   * @returns {Promise<Array>} - Captured frames
   */
  async startCapture() {
    if (this.isCapturing) {
      throw new Error('Already capturing');
    }

    if (!this.webcam || !this.webcam.isActive) {
      throw new Error('Webcam not active');
    }

    this.capturedFrames = [];
    this.isCapturing = true;
    this.captureStartTime = Date.now();

    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
          // Check timeout
          if (Date.now() - this.captureStartTime > this.maxCaptureTime) {
            clearInterval(intervalId);
            this.isCapturing = false;

            if (this.capturedFrames.length < 2) {
              const error = new Error('Timeout: Could not capture enough frames');
              if (this.onError) this.onError(error);
              reject(error);
            } else {
              if (this.onComplete) this.onComplete(this.capturedFrames);
              resolve(this.capturedFrames);
            }
            return;
          }

          // Capture frame
          const frameData = await this.captureFrame();

          if (frameData) {
            this.capturedFrames.push(frameData);

            if (this.onFrameCaptured) {
              this.onFrameCaptured(frameData, this.capturedFrames.length);
            }

            if (this.onProgress) {
              this.onProgress({
                current: this.capturedFrames.length,
                target: this.targetFrames,
                progress: (this.capturedFrames.length / this.targetFrames) * 100
              });
            }
          }

          // Check if we have enough frames
          if (this.capturedFrames.length >= this.targetFrames) {
            clearInterval(intervalId);
            this.isCapturing = false;

            if (this.onComplete) {
              this.onComplete(this.capturedFrames);
            }

            resolve(this.capturedFrames);
          }

        } catch (error) {
          clearInterval(intervalId);
          this.isCapturing = false;

          if (this.onError) {
            this.onError(error);
          }

          reject(error);
        }
      }, this.captureInterval);
    });
  }

  /**
   * Capture single frame and decode QR
   * @returns {Promise<object|null>} - Frame data or null
   */
  async captureFrame() {
    const imageData = this.webcam.captureFrame();

    // Decode QR code (requires jsQR library)
    if (typeof jsQR === 'undefined') {
      console.warn('jsQR library not loaded');
      return null;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (!code) {
      return null;
    }

    // Parse QR data
    let qrData;
    try {
      qrData = JSON.parse(code.data);
    } catch (error) {
      console.warn('Failed to parse QR data:', error);
      return null;
    }

    // Create frame record
    const frameRecord = {
      data: qrData,
      timestamp: Date.now(),
      imageHash: this.hashImageData(imageData),
      location: code.location,
      captureIndex: this.capturedFrames.length
    };

    return frameRecord;
  }

  /**
   * Stop capturing
   */
  stopCapture() {
    this.isCapturing = false;
  }

  /**
   * Reset captured frames
   */
  reset() {
    this.capturedFrames = [];
    this.isCapturing = false;
    this.captureStartTime = 0;
  }

  /**
   * Get capture progress
   * @returns {object} - Progress info
   */
  getProgress() {
    return {
      current: this.capturedFrames.length,
      target: this.targetFrames,
      progress: (this.capturedFrames.length / this.targetFrames) * 100,
      isCapturing: this.isCapturing,
      elapsedTime: this.isCapturing ? Date.now() - this.captureStartTime : 0
    };
  }

  /**
   * Hash image data for uniqueness check
   * @param {ImageData} imageData - Image to hash
   * @returns {string} - Hash
   */
  hashImageData(imageData) {
    // Sample pixels for faster hashing
    const sample = [];
    const step = 1000; // Sample every 1000th pixel

    for (let i = 0; i < imageData.data.length; i += step) {
      sample.push(imageData.data[i]);
    }

    // Simple hash
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
      hash = ((hash << 5) - hash) + sample[i];
      hash = hash & hash;
    }

    return hash.toString(36);
  }

  /**
   * Validate captured frames
   * @returns {object} - Validation result
   */
  validateFrames() {
    if (this.capturedFrames.length < 2) {
      return {
        valid: false,
        reason: 'Insufficient frames'
      };
    }

    // Check for unique frames
    const hashes = this.capturedFrames.map(f => f.imageHash);
    const uniqueHashes = new Set(hashes);

    if (uniqueHashes.size < this.capturedFrames.length) {
      return {
        valid: false,
        reason: 'Duplicate frames detected (screenshot)',
        uniqueCount: uniqueHashes.size,
        totalCount: this.capturedFrames.length
      };
    }

    // Check timestamp progression
    const timestamps = this.capturedFrames.map(f => f.data.t);
    const isIncreasing = timestamps.every((t, i) =>
      i === 0 || t > timestamps[i - 1]
    );

    if (!isIncreasing) {
      return {
        valid: false,
        reason: 'Timestamps not increasing (screenshot)'
      };
    }

    // Check frame numbers
    const frameNums = this.capturedFrames.map(f => f.data.f);
    const isSequential = frameNums.every((fn, i) =>
      i === 0 || fn === frameNums[i - 1] + 1
    );

    if (!isSequential) {
      return {
        valid: false,
        reason: 'Non-sequential frames (tampering)'
      };
    }

    return {
      valid: true,
      reason: 'All checks passed',
      frameCount: this.capturedFrames.length,
      uniqueFrames: uniqueHashes.size,
      sequential: true,
      increasing: true
    };
  }

  /**
   * Get capture statistics
   * @returns {object} - Stats
   */
  getStats() {
    const validation = this.validateFrames();

    return {
      frameCount: this.capturedFrames.length,
      targetFrames: this.targetFrames,
      isCapturing: this.isCapturing,
      captureTime: this.isCapturing ?
        Date.now() - this.captureStartTime :
        (this.capturedFrames.length > 0 ?
          this.capturedFrames[this.capturedFrames.length - 1].timestamp -
          this.capturedFrames[0].timestamp :
          0),
      validation: validation
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FrameCaptureManager;
}
