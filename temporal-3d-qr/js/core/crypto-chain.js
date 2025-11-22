/**
 * CRYPTOGRAPHIC CHALLENGE CHAIN MODULE
 * Manages rolling cryptographic challenges for temporal QR codes
 */

class CryptoChain {
  constructor() {
    this.chain = [];
    this.maxLength = 1000; // Keep last 1000 challenges
  }

  /**
   * Generate challenge from previous hash
   * @param {string} previousHash - Hash of previous frame
   * @param {number} timestamp - Current timestamp
   * @param {number} frameNumber - Current frame number
   * @param {string} sessionId - Session identifier
   * @returns {string} - Generated challenge
   */
  generateChallenge(previousHash, timestamp, frameNumber, sessionId) {
    // Combine all inputs for challenge generation
    const data = previousHash + timestamp + frameNumber + sessionId;

    // Simple hash function (in production, use Web Crypto API)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const challenge = Math.abs(hash).toString(36).substring(0, 16);

    // Add to chain
    this.chain.push({
      challenge: challenge,
      timestamp: timestamp,
      frameNumber: frameNumber,
      previousHash: previousHash
    });

    // Keep chain size manageable
    if (this.chain.length > this.maxLength) {
      this.chain.shift();
    }

    return challenge;
  }

  /**
   * Verify challenge is valid
   * @param {string} challenge - Challenge to verify
   * @param {object} frameData - Frame data
   * @returns {boolean} - True if valid
   */
  verifyChallenge(challenge, frameData) {
    const expectedChallenge = this.generateChallenge(
      frameData.previousHash,
      frameData.timestamp,
      frameData.frameNumber,
      frameData.sessionId
    );

    return challenge === expectedChallenge;
  }

  /**
   * Verify chain integrity
   * @param {Array} frames - Array of frames to verify
   * @returns {object} - Verification result
   */
  verifyChainIntegrity(frames) {
    if (frames.length < 2) {
      return { valid: true, reason: 'Not enough frames to verify chain' };
    }

    for (let i = 1; i < frames.length; i++) {
      const currentFrame = frames[i];
      const previousFrame = frames[i - 1];

      // Verify current frame links to previous
      const expectedPrevHash = previousFrame.c.substring(0, 8);
      const actualPrevHash = currentFrame.p;

      if (expectedPrevHash !== actualPrevHash) {
        return {
          valid: false,
          reason: `Chain broken at frame ${i}: expected ${expectedPrevHash}, got ${actualPrevHash}`,
          frameIndex: i
        };
      }
    }

    return { valid: true, reason: 'Chain integrity verified' };
  }

  /**
   * Reconstruct expected challenge chain
   * @param {string} sessionId - Session ID
   * @param {number} startTimestamp - Starting timestamp
   * @param {number} startFrame - Starting frame number
   * @param {number} length - Number of challenges to generate
   * @returns {Array} - Expected challenge chain
   */
  reconstructChain(sessionId, startTimestamp, startFrame, length) {
    const chain = [];
    let previousHash = '0';

    for (let i = 0; i < length; i++) {
      const timestamp = startTimestamp + (i * 16.67); // Approximate 60 FPS
      const frameNumber = startFrame + i;

      const challenge = this.generateChallenge(
        previousHash,
        Math.floor(timestamp),
        frameNumber,
        sessionId
      );

      chain.push(challenge);
      previousHash = challenge;
    }

    return chain;
  }

  /**
   * Check if challenge has been used before (replay detection)
   * @param {string} challenge - Challenge to check
   * @returns {boolean} - True if already used
   */
  hasBeenUsed(challenge) {
    return this.chain.some(item => item.challenge === challenge);
  }

  /**
   * Clear the chain
   */
  clear() {
    this.chain = [];
  }

  /**
   * Get chain statistics
   * @returns {object} - Chain stats
   */
  getStats() {
    return {
      length: this.chain.length,
      oldestTimestamp: this.chain[0]?.timestamp || null,
      newestTimestamp: this.chain[this.chain.length - 1]?.timestamp || null,
      frameRange: {
        start: this.chain[0]?.frameNumber || null,
        end: this.chain[this.chain.length - 1]?.frameNumber || null
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoChain;
}
