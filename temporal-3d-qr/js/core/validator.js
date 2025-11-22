/**
 * TEMPORAL COHERENCE VALIDATOR MODULE
 * Validates temporal coherence of captured QR frames
 */

class TemporalValidator {
  constructor() {
    this.cryptoChain = new CryptoChain();
  }

  /**
   * Validate complete frame sequence
   * @param {Array} frames - Captured frames
   * @returns {object} - Validation result with score
   */
  validate(frames) {
    if (!frames || frames.length < 2) {
      return {
        valid: false,
        score: 0,
        reason: 'Insufficient frames (need at least 2)',
        details: {}
      };
    }

    // Run all validation checks
    const timingCheck = this.validateTiming(frames);
    const sequenceCheck = this.validateSequence(frames);
    const cryptoCheck = this.validateCrypto(frames);
    const uniquenessCheck = this.validateUniqueness(frames);
    const ageCheck = this.validateAge(frames);

    // Calculate weighted score
    const weights = {
      timing: 0.25,
      sequence: 0.20,
      crypto: 0.30,
      uniqueness: 0.15,
      age: 0.10
    };

    const score = (
      timingCheck.score * weights.timing +
      sequenceCheck.score * weights.sequence +
      cryptoCheck.score * weights.crypto +
      uniquenessCheck.score * weights.uniqueness +
      ageCheck.score * weights.age
    );

    // Overall validity requires all critical checks to pass
    const valid = (
      timingCheck.valid &&
      sequenceCheck.valid &&
      cryptoCheck.valid &&
      uniquenessCheck.valid &&
      ageCheck.valid
    );

    return {
      valid: valid,
      score: score,
      reason: valid ? 'All validations passed' : this.getFailureReason({
        timingCheck,
        sequenceCheck,
        cryptoCheck,
        uniquenessCheck,
        ageCheck
      }),
      details: {
        timing: timingCheck,
        sequence: sequenceCheck,
        crypto: cryptoCheck,
        uniqueness: uniquenessCheck,
        age: ageCheck
      }
    };
  }

  /**
   * Validate timestamp progression
   * @param {Array} frames - Frames to validate
   * @returns {object} - Validation result
   */
  validateTiming(frames) {
    const timestamps = frames.map(f => f.data?.t || f.t);

    // Check 1: Strictly increasing
    const isIncreasing = timestamps.every((t, i) =>
      i === 0 || t > timestamps[i - 1]
    );

    if (!isIncreasing) {
      return {
        valid: false,
        score: 0,
        reason: 'Timestamps not increasing (screenshot detected)',
        timestamps: timestamps
      };
    }

    // Check 2: Reasonable intervals
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const validInterval = avgInterval >= 10 && avgInterval <= 200; // 10ms to 200ms

    // Check 3: No suspicious jumps
    const maxJump = Math.max(...intervals);
    const minJump = Math.min(...intervals);
    const jumpRatio = maxJump / Math.max(minJump, 1);
    const reasonableJumps = jumpRatio < 5; // Max 5x variance

    const score = (
      (isIncreasing ? 0.4 : 0) +
      (validInterval ? 0.4 : 0) +
      (reasonableJumps ? 0.2 : 0)
    );

    return {
      valid: isIncreasing && validInterval && reasonableJumps,
      score: score,
      reason: score === 1.0 ? 'Timing valid' : 'Timing inconsistencies detected',
      avgInterval: avgInterval,
      intervals: intervals,
      jumpRatio: jumpRatio
    };
  }

  /**
   * Validate frame number sequence
   * @param {Array} frames - Frames to validate
   * @returns {object} - Validation result
   */
  validateSequence(frames) {
    const frameNumbers = frames.map(f => f.data?.f || f.f);

    // Check sequential progression
    const isSequential = frameNumbers.every((fn, i) =>
      i === 0 || fn === frameNumbers[i - 1] + 1
    );

    return {
      valid: isSequential,
      score: isSequential ? 1.0 : 0,
      reason: isSequential ? 'Sequence valid' : 'Non-sequential frames (tampering detected)',
      frameNumbers: frameNumbers
    };
  }

  /**
   * Validate cryptographic chain
   * @param {Array} frames - Frames to validate
   * @returns {object} - Validation result
   */
  validateCrypto(frames) {
    const chainResult = this.cryptoChain.verifyChainIntegrity(frames);

    return {
      valid: chainResult.valid,
      score: chainResult.valid ? 1.0 : 0,
      reason: chainResult.reason,
      details: chainResult
    };
  }

  /**
   * Validate frame uniqueness (detect duplicates)
   * @param {Array} frames - Frames to validate
   * @returns {object} - Validation result
   */
  validateUniqueness(frames) {
    const hashes = frames.map(f => f.imageHash || this.hashFrame(f));
    const uniqueHashes = new Set(hashes);

    const allUnique = uniqueHashes.size === frames.length;

    return {
      valid: allUnique,
      score: allUnique ? 1.0 : (uniqueHashes.size / frames.length),
      reason: allUnique ? 'All frames unique' : 'Duplicate frames detected (screenshot)',
      uniqueCount: uniqueHashes.size,
      totalCount: frames.length
    };
  }

  /**
   * Validate frame age (must be recent)
   * @param {Array} frames - Frames to validate
   * @returns {object} - Validation result
   */
  validateAge(frames) {
    const now = Date.now();
    const timestamps = frames.map(f => f.data?.t || f.t);
    const maxAge = 5000; // 5 seconds

    const ages = timestamps.map(t => now - t);
    const maxFrameAge = Math.max(...ages);

    const allRecent = maxFrameAge < maxAge;

    return {
      valid: allRecent,
      score: allRecent ? 1.0 : Math.max(0, 1 - (maxFrameAge / (maxAge * 2))),
      reason: allRecent ? 'All frames recent' : 'Old frames detected (replay attack)',
      maxAge: maxFrameAge,
      threshold: maxAge
    };
  }

  /**
   * Hash a frame (simple hash for demo)
   * @param {object} frame - Frame to hash
   * @returns {string} - Hash
   */
  hashFrame(frame) {
    const data = JSON.stringify(frame.data || frame);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get failure reason from validation results
   * @param {object} checks - All validation checks
   * @returns {string} - Primary failure reason
   */
  getFailureReason(checks) {
    if (!checks.timingCheck.valid) return checks.timingCheck.reason;
    if (!checks.sequenceCheck.valid) return checks.sequenceCheck.reason;
    if (!checks.cryptoCheck.valid) return checks.cryptoCheck.reason;
    if (!checks.uniquenessCheck.valid) return checks.uniquenessCheck.reason;
    if (!checks.ageCheck.valid) return checks.ageCheck.reason;
    return 'Unknown validation failure';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemporalValidator;
}
