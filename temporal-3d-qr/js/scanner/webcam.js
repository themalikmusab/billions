/**
 * WEBCAM SCANNER MODULE
 * Handles webcam access and video capture
 */

class WebcamScanner {
  constructor(config = {}) {
    this.videoElement = config.videoElement || null;
    this.stream = null;
    this.isActive = false;
    this.facingMode = config.facingMode || 'environment'; // 'user' or 'environment'

    // Callbacks
    this.onStart = config.onStart || null;
    this.onStop = config.onStop || null;
    this.onError = config.onError || null;
  }

  /**
   * Initialize and start webcam
   * @param {HTMLVideoElement} videoElement - Video element to display stream
   * @returns {Promise<MediaStream>} - Camera stream
   */
  async start(videoElement) {
    if (this.isActive) {
      console.warn('Webcam already active');
      return this.stream;
    }

    this.videoElement = videoElement || this.videoElement;

    if (!this.videoElement) {
      throw new Error('Video element required');
    }

    try {
      // Request camera access with optimal settings
      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 1280, max: 1920 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Attach stream to video element
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      this.isActive = true;

      if (this.onStart) {
        this.onStart(this.getStreamInfo());
      }

      return this.stream;

    } catch (error) {
      console.error('Failed to access webcam:', error);

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Stop webcam
   */
  stop() {
    if (!this.isActive) return;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isActive = false;

    if (this.onStop) {
      this.onStop();
    }
  }

  /**
   * Switch camera (front/back)
   * @returns {Promise<void>}
   */
  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

    if (this.isActive) {
      const videoElement = this.videoElement;
      this.stop();
      await this.start(videoElement);
    }
  }

  /**
   * Capture current frame as image
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {ImageData} - Captured image data
   */
  captureFrame(width, height) {
    if (!this.isActive || !this.videoElement) {
      throw new Error('Webcam not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width || this.videoElement.videoWidth;
    canvas.height = height || this.videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Capture frame as blob
   * @param {string} format - Image format ('image/png', 'image/jpeg')
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<Blob>} - Image blob
   */
  async captureFrameBlob(format = 'image/png', quality = 0.95) {
    if (!this.isActive || !this.videoElement) {
      throw new Error('Webcam not active');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, format, quality);
    });
  }

  /**
   * Get camera capabilities
   * @returns {object} - Camera capabilities
   */
  getCapabilities() {
    if (!this.stream) return null;

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    return videoTrack.getCapabilities();
  }

  /**
   * Get current settings
   * @returns {object} - Current camera settings
   */
  getSettings() {
    if (!this.stream) return null;

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    return videoTrack.getSettings();
  }

  /**
   * Get stream information
   * @returns {object} - Stream info
   */
  getStreamInfo() {
    if (!this.stream) return null;

    const settings = this.getSettings();

    return {
      active: this.isActive,
      facingMode: this.facingMode,
      resolution: {
        width: settings?.width || 0,
        height: settings?.height || 0
      },
      frameRate: settings?.frameRate || 0,
      deviceId: settings?.deviceId || null
    };
  }

  /**
   * Check if webcam is supported
   * @returns {boolean} - True if supported
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get available cameras
   * @returns {Promise<Array>} - Available camera devices
   */
  static async getAvailableCameras() {
    if (!WebcamScanner.isSupported()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Request camera permission
   * @returns {Promise<boolean>} - True if granted
   */
  static async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebcamScanner;
}
