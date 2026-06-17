/**
 * Global EventBus
 * 
 * Central PubSub architecture for the Swaroscope ecosystem.
 * Decouples PitchEngines, VisualizationEngines, and RecordingEngines.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name (e.g., 'Playback:Started')
   * @param {Function} callback - Function to execute
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  /**
   * Publish an event.
   * @param {string} event 
   * @param {any} [payload] 
   */
  emit(event, payload = null) {
    if (this._listeners.has(event)) {
      for (const callback of this._listeners.get(event)) {
        try {
          callback(payload);
        } catch (e) {
          console.error(`[EventBus] Error in listener for ${event}:`, e);
        }
      }
    }
  }
}

// Global Singleton
export const globalEventBus = new EventBus();

// Standard Event Names
export const EVENTS = {
  PLAYBACK_STARTED: 'Playback:Started',
  PLAYBACK_PAUSED: 'Playback:Paused',
  PLAYBACK_SEEKED: 'Playback:Seeked',
  TRACK_LOADED: 'Track:Loaded',
  REGION_SELECTED: 'Region:Selected',
  RECORDING_STARTED: 'Recording:Started',
  RECORDING_STOPPED: 'Recording:Stopped',
  AI_ANNOTATION_ADDED: 'AI:AnnotationAdded'
};
