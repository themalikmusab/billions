/**
 * STORAGE MANAGEMENT MODULE
 * Handles offline proof storage and synchronization
 */

class StorageManager {
  constructor() {
    this.dbName = 'TemporalQRStorage';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<IDBDatabase>} - Database instance
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create proofs store
        if (!db.objectStoreNames.contains('proofs')) {
          const proofStore = db.createObjectStore('proofs', { keyPath: 'id' });
          proofStore.createIndex('synced', 'synced', { unique: false });
          proofStore.createIndex('createdAt', 'createdAt', { unique: false });
          proofStore.createIndex('sessionId', 'sessionId', { unique: false });
        }

        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Store proof locally
   * @param {object} proof - Proof to store
   * @returns {Promise<string>} - Proof ID
   */
  async storeProof(proof) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readwrite');
      const store = transaction.objectStore('proofs');

      const proofRecord = {
        id: proof.proofId,
        proof: this.encryptProof(proof),
        synced: false,
        createdAt: proof.createdAt,
        sessionId: proof.data.sessionId,
        expiresAt: proof.createdAt + (24 * 60 * 60 * 1000) // 24 hours
      };

      const request = store.add(proofRecord);

      request.onsuccess = () => resolve(proof.proofId);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get proof by ID
   * @param {string} proofId - Proof identifier
   * @returns {Promise<object>} - Proof data
   */
  async getProof(proofId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readonly');
      const store = transaction.objectStore('proofs');
      const request = store.get(proofId);

      request.onsuccess = () => {
        if (request.result) {
          const decrypted = this.decryptProof(request.result.proof);
          resolve(decrypted);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all unsynced proofs
   * @returns {Promise<Array>} - Unsynced proofs
   */
  async getUnsyncedProofs() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readonly');
      const store = transaction.objectStore('proofs');
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => {
        const proofs = request.result.map(record => {
          return {
            id: record.id,
            proof: this.decryptProof(record.proof),
            createdAt: record.createdAt
          };
        });
        resolve(proofs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark proof as synced
   * @param {string} proofId - Proof identifier
   * @returns {Promise<void>}
   */
  async markAsSynced(proofId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readwrite');
      const store = transaction.objectStore('proofs');
      const request = store.get(proofId);

      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          record.synced = true;
          record.syncedAt = Date.now();
          const updateRequest = store.put(record);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Proof not found'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete proof
   * @param {string} proofId - Proof identifier
   * @returns {Promise<void>}
   */
  async deleteProof(proofId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readwrite');
      const store = transaction.objectStore('proofs');
      const request = store.delete(proofId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean expired proofs
   * @returns {Promise<number>} - Number of deleted proofs
   */
  async cleanExpired() {
    if (!this.db) await this.init();

    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readwrite');
      const store = transaction.objectStore('proofs');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.expiresAt < now) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage statistics
   * @returns {Promise<object>} - Storage stats
   */
  async getStats() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs'], 'readonly');
      const store = transaction.objectStore('proofs');
      const countRequest = store.count();

      countRequest.onsuccess = async () => {
        const total = countRequest.result;
        const unsynced = await this.getUnsyncedProofs();

        resolve({
          total: total,
          synced: total - unsynced.length,
          unsynced: unsynced.length,
          pendingSync: unsynced.length > 0
        });
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  /**
   * Encrypt proof before storage (simple XOR for demo)
   * @param {object} proof - Proof to encrypt
   * @returns {string} - Encrypted proof
   */
  encryptProof(proof) {
    // In production, use proper encryption (AES-GCM)
    // For demo, just base64 encode
    return btoa(JSON.stringify(proof));
  }

  /**
   * Decrypt stored proof
   * @param {string} encrypted - Encrypted proof
   * @returns {object} - Decrypted proof
   */
  decryptProof(encrypted) {
    try {
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Failed to decrypt proof:', error);
      return null;
    }
  }

  /**
   * Clear all data
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['proofs', 'sessions'], 'readwrite');

      transaction.objectStore('proofs').clear();
      transaction.objectStore('sessions').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
