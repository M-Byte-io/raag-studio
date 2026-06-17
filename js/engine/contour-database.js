/**
 * ContourDatabase (IndexedDB wrapper)
 * 
 * Manages the storage and retrieval of SessionProjects, PitchTracks, 
 * and their massive Float32Array arrays using IndexedDB.
 */

const DB_NAME = 'SwaroscopeDB';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';

export class ContourDatabase {
  constructor() {
    this._db = null;
  }

  /**
   * Initializes the IndexedDB connection.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._db) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this._db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Saves a full SessionProject to IDB.
   * Float32Arrays inside Track objects are natively supported by the structured clone algorithm.
   * @param {import('./architecture/session-schema.js').SessionProject} session 
   * @returns {Promise<void>}
   */
  async saveSession(session) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const request = store.put(session);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves a SessionProject by ID.
   * @param {string} id 
   * @returns {Promise<import('./architecture/session-schema.js').SessionProject | null>}
   */
  async getSession(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes a SessionProject.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async deleteSession(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton export
export const contourDB = new ContourDatabase();
