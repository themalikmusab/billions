/**
 * OFFLINE PROOF GENERATION MODULE
 * Generates cryptographic attendance proofs for offline validation
 */

class OfflineProofGenerator {
  constructor(studentId, deviceId) {
    this.studentId = studentId;
    this.deviceId = deviceId || this.generateDeviceId();
    this.deviceSecret = this.loadDeviceSecret();
  }

  /**
   * Generate device ID
   * @returns {string} - Unique device identifier
   */
  generateDeviceId() {
    const id = 'DEVICE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', id);
    return id;
  }

  /**
   * Load or create device secret
   * @returns {string} - Device secret
   */
  loadDeviceSecret() {
    let secret = localStorage.getItem('deviceSecret');
    if (!secret) {
      secret = this.generateSecret();
      localStorage.setItem('deviceSecret', secret);
    }
    return secret;
  }

  /**
   * Generate cryptographic secret
   * @returns {string} - Random secret
   */
  generateSecret() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate attendance proof from captured frames
   * @param {Array} frames - Captured QR frames
   * @param {object} sessionData - Session metadata
   * @param {object} validation - Validation results
   * @returns {Promise<object>} - Cryptographic proof
   */
  async generateProof(frames, sessionData, validation) {
    const proofData = {
      // Layer 1: Student identity
      studentId: this.studentId,
      deviceId: this.deviceId,

      // Layer 2: Session data
      sessionId: sessionData.sessionId || frames[0]?.data?.s,
      sessionName: sessionData.sessionName,
      courseId: sessionData.courseId,

      // Layer 3: Captured frames (compressed)
      frames: this.compressFrames(frames),

      // Layer 4: Validation results
      validation: {
        score: validation.score,
        valid: validation.valid,
        timestamp: Date.now()
      },

      // Layer 5: Device attestation
      attestation: await this.getDeviceAttestation(),

      // Layer 6: Timestamps
      captureTimestamp: Date.now(),
      deviceTime: new Date().toISOString()
    };

    // Generate cryptographic signature
    const signature = await this.signProof(proofData);

    // Try to get hardware signature if available
    const hardwareSignature = await this.getHardwareSignature(proofData);

    const proof = {
      version: 1,
      data: proofData,
      signature: signature,
      hardwareSignature: hardwareSignature,
      proofId: this.generateProofId(),
      createdAt: Date.now()
    };

    return proof;
  }

  /**
   * Compress frames to reduce storage
   * @param {Array} frames - Frames to compress
   * @returns {Array} - Compressed frames
   */
  compressFrames(frames) {
    return frames.map(f => ({
      t: f.data?.t || f.t,
      f: f.data?.f || f.f,
      c: f.data?.c || f.c,
      p: f.data?.p || f.p,
      h: f.imageHash
    }));
  }

  /**
   * Sign proof with device credentials
   * @param {object} proofData - Data to sign
   * @returns {Promise<string>} - Signature
   */
  async signProof(proofData) {
    const data = JSON.stringify(proofData);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + this.deviceSecret);

    try {
      // Use Web Crypto API for proper signing
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return signature;
    } catch (error) {
      // Fallback to simple hash
      console.warn('Web Crypto not available, using fallback');
      return this.simpleHash(data + this.deviceSecret);
    }
  }

  /**
   * Simple hash fallback
   * @param {string} data - Data to hash
   * @returns {string} - Hash
   */
  simpleHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get hardware-backed signature if available
   * @param {object} proofData - Data to sign
   * @returns {Promise<object|null>} - Hardware signature or null
   */
  async getHardwareSignature(proofData) {
    // Check if WebAuthn is available
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        // This would require user interaction (biometric/PIN)
        // For demo purposes, we'll skip actual WebAuthn implementation
        return {
          available: true,
          type: 'webauthn',
          timestamp: Date.now()
        };
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Get device attestation data
   * @returns {Promise<object>} - Device attestation
   */
  async getDeviceAttestation() {
    const attestation = {
      // Device identity
      userAgent: navigator.userAgent,
      platform: navigator.platform,

      // Screen properties
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },

      // Locale/timezone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,

      // Sensor availability
      sensors: {
        accelerometer: typeof Accelerometer !== 'undefined',
        gyroscope: typeof Gyroscope !== 'undefined'
      },

      // Battery info (if available)
      battery: await this.getBatteryInfo(),

      // Device fingerprint
      fingerprint: await this.generateFingerprint()
    };

    return attestation;
  }

  /**
   * Get battery information
   * @returns {Promise<object|null>} - Battery info
   */
  async getBatteryInfo() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: battery.level,
          charging: battery.charging
        };
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Generate device fingerprint
   * @returns {Promise<string>} - Fingerprint hash
   */
  async generateFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0
    ];

    const fingerprintString = components.join('|');
    return this.simpleHash(fingerprintString);
  }

  /**
   * Generate unique proof ID
   * @returns {string} - Proof ID
   */
  generateProofId() {
    return 'PROOF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
  }

  /**
   * Verify a proof's signature
   * @param {object} proof - Proof to verify
   * @returns {Promise<boolean>} - True if valid
   */
  async verifyProof(proof) {
    try {
      const recomputedSignature = await this.signProof(proof.data);
      return recomputedSignature === proof.signature;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineProofGenerator;
}
