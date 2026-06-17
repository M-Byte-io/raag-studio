import { globalEventBus, EVENTS } from './architecture/event-bus.js';
import { UserPitchTrack } from './architecture/track-schema.js';
import { syncManager } from './synchronization-manager.js';

/**
 * RecordingEngine
 * 
 * Manages live microphone recording. Connects the microphone to the 
 * PitchProcessor AudioWorklet, collects the fractional MIDI frames, 
 * and actively constructs a UserPitchTrack synchronized to the master clock.
 */
export class RecordingEngine {
  /**
   * @param {AudioContext} audioCtx 
   */
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.isRecording = false;
    this.micStream = null;
    this.micSource = null;
    this.pitchNode = null;
    
    // The active track we are recording into
    /** @type {UserPitchTrack | null} */
    this.activeTrack = null;
    
    // Temporary recording buffers (since we don't know the final duration)
    this._midiBuffer = [];
    this._confidenceBuffer = [];
    this._rmsBuffer = [];
    this._timeBuffer = []; // To guarantee sync mapping
  }

  /**
   * Requests microphone access and prepares the AudioWorklet.
   */
  async prepare() {
    if (!this.ctx) throw new Error("AudioContext required");
    
    // Ensure worklet is loaded
    try {
      await this.ctx.audioWorklet.addModule('/js/audio/worklets/pitch-processor.js');
    } catch (e) {
      console.warn("Worklet already loaded or path incorrect", e);
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      }
    });

    this.micSource = this.ctx.createMediaStreamSource(this.micStream);
    this.pitchNode = new AudioWorkletNode(this.ctx, 'pitch-processor');
    
    this.micSource.connect(this.pitchNode);
    // Node connects to nothing (analysis only)

    this.pitchNode.port.onmessage = (event) => {
      if (this.isRecording) {
        this._handlePitchFrame(event.data);
      }
    };
  }

  /**
   * Starts a new recording take.
   */
  startRecording() {
    if (!this.micStream) throw new Error("Microphone not prepared");
    if (this.isRecording) return;

    this.isRecording = true;
    this.activeTrack = new UserPitchTrack();
    
    this._midiBuffer = [];
    this._confidenceBuffer = [];
    this._rmsBuffer = [];
    this._timeBuffer = [];

    globalEventBus.emit(EVENTS.RECORDING_STARTED, this.activeTrack.id);
  }

  /**
   * Stops recording and finalizes the UserPitchTrack.
   * @returns {UserPitchTrack} The completed track object.
   */
  stopRecording() {
    if (!this.isRecording) return null;
    this.isRecording = false;

    // Finalize Arrays
    const len = this._midiBuffer.length;
    this.activeTrack.midiTrack = new Float32Array(this._midiBuffer);
    
    this.activeTrack.features.confidence = {
      type: 'confidence',
      data: new Float32Array(this._confidenceBuffer),
      minValue: 0, maxValue: 1
    };
    
    this.activeTrack.features.rms = {
      type: 'rms',
      data: new Float32Array(this._rmsBuffer),
      minValue: 0, maxValue: 1
    };

    // Note: We don't calculate slope/curvature for UserTracks offline.
    // They are computed dynamically when AI feedback is requested to save real-time RAM.

    globalEventBus.emit(EVENTS.RECORDING_STOPPED, this.activeTrack);
    
    const finalizedTrack = this.activeTrack;
    this.activeTrack = null;
    return finalizedTrack;
  }

  /**
   * Disconnects mic and releases hardware.
   */
  teardown() {
    this.stopRecording();
    if (this.micSource) this.micSource.disconnect();
    if (this.pitchNode) this.pitchNode.disconnect();
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }
  }

  /**
   * Receives data from PitchProcessor at ~100fps
   */
  _handlePitchFrame(data) {
    const { midi, rms, confidence } = data;
    const t = syncManager.getCurrentTime(); // absolute timeline matching
    
    this._timeBuffer.push(t);
    this._midiBuffer.push(midi || 0);
    this._rmsBuffer.push(rms || 0);
    this._confidenceBuffer.push(confidence || 0);
  }
}
