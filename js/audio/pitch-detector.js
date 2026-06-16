/**
 * PITCH DETECTOR — Real-time microphone pitch detection
 *
 * Algorithm: Autocorrelation (YIN-inspired, optimised for voice/string instruments).
 * Accuracy: ~±2 cents, latency: ~one analysis frame (typically 23ms at 2048 samples, 44.1kHz).
 *
 * Exports:
 *   PitchDetector  — class, one instance per session
 *
 * Usage:
 *   const pd = new PitchDetector(audioCtx);
 *   await pd.start();
 *   pd.onResult = ({ freq, note, cents, swara, confidence }) => { ... };
 *   pd.stop();
 */

import { SWARAS } from '../data/swaras.js';

// ── Constants ────────────────────────────────────────────────────────────────

const FFT_SIZE       = 4096;   // analysis window — more resolution, ~93ms at 44.1kHz
const MIN_FREQ       = 60;     // Hz — below this is noise / background hum
const MAX_FREQ       = 1500;   // Hz — above this tabla/tanpura overtones start dominating
const SILENCE_THRESH = 0.008;  // RMS below this = silence, skip detection
const CONFIDENCE_MIN = 0.90;   // autocorrelation peak must exceed this to report a result

// All 12 Western note names (used for display alongside swara names)
const WESTERN_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── PitchDetector ────────────────────────────────────────────────────────────

export class PitchDetector {
  /**
   * @param {AudioContext} ctx
   * @param {{ basePitch?: number }} options
   *   basePitch: semitone of Sa (0=C, 1=C#, … 11=B). Default 0.
   */
  constructor(ctx, { basePitch = 0 } = {}) {
    this._ctx        = ctx;
    this._basePitch  = basePitch; // semitone offset of Sa from C
    this._running    = false;
    this._rafId      = null;
    this._stream     = null;
    this._source     = null;
    this._analyser   = null;
    this._buf        = null;

    /** Called each frame with result object or null (silence/no pitch). */
    this.onResult = null;
  }

  /** Update Sa reference when user changes base pitch. */
  setBasePitch(semit) {
    this._basePitch = semit;
  }

  /** Request mic access and start the detection loop. */
  async start() {
    if (this._running) return;

    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,   // we want raw signal
        noiseSuppression: false,
        autoGainControl:  false,
        channelCount:     1,
      },
    });

    this._source   = this._ctx.createMediaStreamSource(this._stream);
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize      = FFT_SIZE;
    this._analyser.smoothingTimeConstant = 0; // no smoothing — we want crisp frames

    this._source.connect(this._analyser);
    // NOTE: deliberately NOT connecting to destination — no mic feedback

    this._buf    = new Float32Array(this._analyser.fftSize);
    this._running = true;
    this._loop();
  }

  /** Stop detection and release microphone. */
  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._source)   { this._source.disconnect(); this._source = null; }
    if (this._stream)   { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    this._analyser = null;
    this._buf      = null;
  }

  get isRunning() { return this._running; }

  // ── Private ────────────────────────────────────────────────────────────────

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());

    this._analyser.getFloatTimeDomainData(this._buf);

    // RMS check — skip silent frames
    const rms = _rms(this._buf);
    if (rms < SILENCE_THRESH) {
      this.onResult?.(null); // silence
      return;
    }

    const result = this._detect(this._buf, this._ctx.sampleRate);
    if (result) {
      result.swara    = this._freqToSwara(result.freq);
      result.rms      = rms;
      this.onResult?.(result);
    } else {
      this.onResult?.(null);
    }
  }

  /**
   * Autocorrelation pitch detection.
   * Returns { freq, note, cents, confidence } or null.
   */
  _detect(buf, sampleRate) {
    const n = buf.length;

    // ── Autocorrelation ──
    // AC[lag] = sum of buf[i] * buf[i + lag]
    // We scan lags corresponding to MIN_FREQ → MAX_FREQ
    const lagMin = Math.floor(sampleRate / MAX_FREQ);
    const lagMax = Math.ceil(sampleRate / MIN_FREQ);

    let bestLag = -1;
    let bestCorr = -Infinity;

    // Normalised autocorrelation (NSDF)
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let corr = 0;
      let norm = 0;
      for (let i = 0; i < n - lag; i++) {
        corr += buf[i] * buf[i + lag];
        norm += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
      }
      const nsdf = norm > 0 ? (2 * corr) / norm : 0;

      if (nsdf > bestCorr) {
        bestCorr = nsdf;
        bestLag  = lag;
      }
    }

    if (bestLag < 0 || bestCorr < CONFIDENCE_MIN) return null;

    // Sub-sample interpolation (parabolic) for more accurate lag
    const prev = bestLag > 0 ? _autocorr(buf, bestLag - 1, n) : bestCorr;
    const next = bestLag < n - 1 ? _autocorr(buf, bestLag + 1, n) : bestCorr;
    const lagAccurate = bestLag + 0.5 * (prev - next) / (prev - 2 * bestCorr + next);

    const freq = sampleRate / lagAccurate;
    if (freq < MIN_FREQ || freq > MAX_FREQ) return null;

    // Map to nearest semitone (equal temperament, A4=440Hz)
    const midi       = 12 * Math.log2(freq / 440) + 69;
    const midiRound  = Math.round(midi);
    const cents      = Math.round((midi - midiRound) * 100); // -50..+50
    const semitInOct = ((midiRound % 12) + 12) % 12;
    const note       = WESTERN_NOTES[semitInOct];
    const octave     = Math.floor(midiRound / 12) - 1;

    return {
      freq:       Math.round(freq * 10) / 10,  // Hz, 1 decimal
      note,                                      // e.g. 'A'
      octave,                                    // e.g. 4
      midiNote:   midiRound,
      cents,
      confidence: Math.round(bestCorr * 100),
    };
  }

  /**
   * Map a detected frequency to the nearest Hindustani swara
   * relative to the current Sa (basePitch).
   * Returns { swara, octave, centsFromSwara }
   */
  _freqToSwara(freq) {
    // Sa frequency at octave 4 given basePitch semitone
    // basePitch: 0=C, 9=A, etc.
    const saFreq4 = 440 * Math.pow(2, (this._basePitch - 9) / 12); // Sa at oct 4

    // How many semitones above Sa is this freq?
    const semiAboveSa = 12 * Math.log2(freq / saFreq4);
    const semiRound   = Math.round(semiAboveSa);

    // Normalize to 0–11 + octave offset
    const octOffset   = Math.floor(semiRound / 12);
    const degreeInOct = ((semiRound % 12) + 12) % 12;

    // Find matching swara (SWARAS covers 0–12, 12 = Taar Sa = 0 + octave+1)
    const sw = SWARAS.find(s => s.semit === degreeInOct) || SWARAS[0];

    const centsFromSwara = Math.round((semiAboveSa - semiRound) * 100);

    return {
      id:    sw.id,
      full:  sw.full,
      label: sw.label,
      type:  sw.type,
      octOffset,          // 0=Madhya, 1=Taar, -1=Mandra
      centsFromSwara,     // -50..+50 cents deviation from nearest swara
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function _autocorr(buf, lag, n) {
  let corr = 0, norm = 0;
  for (let i = 0; i < n - lag; i++) {
    corr += buf[i] * buf[i + lag];
    norm += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
  }
  return norm > 0 ? (2 * corr) / norm : 0;
}
