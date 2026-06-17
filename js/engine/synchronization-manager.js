import { globalEventBus, EVENTS } from './architecture/event-bus.js';

/**
 * SynchronizationManager
 * 
 * Bridges the HTML5 <audio> element (MediaElement) with the high-precision 
 * performance.now() clock to provide a smoothed, jitter-free master clock 
 * for the VisualizationEngine to poll.
 */
export class SynchronizationManager {
  constructor() {
    this.audioElement = null;
    
    // Phase-Locked Loop (PLL) state
    this._isRunning = false;
    this._lastAudioTime = 0;
    this._lastPolledTime = 0;
    this._smoothedTime = 0;
    this._rafId = null;
  }

  /**
   * Binds the manager to an HTMLAudioElement.
   * @param {HTMLAudioElement} audioEl 
   */
  bindAudio(audioEl) {
    this.audioElement = audioEl;
    
    this.audioElement.addEventListener('play', () => {
      this._isRunning = true;
      this._lastAudioTime = this.audioElement.currentTime;
      this._lastPolledTime = performance.now();
      this._smoothedTime = this._lastAudioTime;
      this._loop();
      globalEventBus.emit(EVENTS.PLAYBACK_STARTED);
    });

    this.audioElement.addEventListener('pause', () => {
      this._isRunning = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      globalEventBus.emit(EVENTS.PLAYBACK_PAUSED);
    });

    this.audioElement.addEventListener('seeked', () => {
      this._smoothedTime = this.audioElement.currentTime;
      this._lastAudioTime = this._smoothedTime;
      globalEventBus.emit(EVENTS.PLAYBACK_SEEKED, this._smoothedTime);
    });
  }

  getCurrentTime() {
    if (this._isVirtual) {
      return this._smoothedTime;
    }
    if (!this._isRunning || !this.audioElement) {
      return this.audioElement ? this.audioElement.currentTime : 0;
    }
    return this._smoothedTime;
  }

  startVirtualClock() {
    this._isVirtual = true;
    this._isRunning = true;
    this._virtualStartTime = performance.now();
    this._lastPolledTime = performance.now();
    this._smoothedTime = 0;
    this._loop();
    globalEventBus.emit(EVENTS.PLAYBACK_STARTED);
  }

  stopVirtualClock() {
    this._isVirtual = false;
    this._isRunning = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._smoothedTime = 0;
    globalEventBus.emit(EVENTS.PLAYBACK_PAUSED);
  }

  _loop() {
    if (!this._isRunning) return;
    this._rafId = requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const dt = (now - this._lastPolledTime) / 1000.0;
    this._lastPolledTime = now;

    if (this._isVirtual) {
      this._smoothedTime += dt;
      return;
    }

    if (!this.audioElement) return;

    const currentAudioTime = this.audioElement.currentTime;
    const playbackRate = this.audioElement.playbackRate;

    // If the audio element's time jumped significantly (e.g. seeking or stall)
    if (Math.abs(currentAudioTime - this._lastAudioTime) > 0.1) {
      this._smoothedTime = currentAudioTime;
    } else {
      // Extrapolate smoothly
      this._smoothedTime += dt * playbackRate;
      
      // Gentle drift correction (pull smoothed time towards actual audio time)
      const drift = currentAudioTime - this._smoothedTime;
      this._smoothedTime += drift * 0.1; 
    }

    this._lastAudioTime = currentAudioTime;
  }
}

// Global singleton
export const syncManager = new SynchronizationManager();
