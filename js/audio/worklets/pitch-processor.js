/**
 * PitchProcessor (AudioWorklet)
 * 
 * Executes YIN pitch detection on a separate audio thread.
 * Returns fractional MIDI values for offline extraction or real-time mic tracking.
 */

const MIN_FREQ = 60;
const MAX_FREQ = 1200;
const YIN_THRESHOLD = 0.15;

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 4096 frames at 44.1kHz is ~93ms window.
    this._bufferSize = 4096;
    this._buffer = new Float32Array(this._bufferSize);
    this._bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    
    // Fill our sliding window buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bufferIndex++] = channelData[i];
      
      // When buffer is full, analyze it
      if (this._bufferIndex >= this._bufferSize) {
        this._analyze();
        
        // Overlap: keep the last half of the buffer, shift it down
        const overlap = this._bufferSize / 2;
        this._buffer.copyWithin(0, overlap);
        this._bufferIndex = overlap;
      }
    }

    // We do NOT copy input to output — this is an analysis node only.
    return true;
  }

  _analyze() {
    // RMS check for silence
    let sum = 0;
    for (let i = 0; i < this._bufferSize; i++) {
      sum += this._buffer[i] * this._buffer[i];
    }
    const rms = Math.sqrt(sum / this._bufferSize);
    
    if (rms < 0.010) {
      this.port.postMessage({ type: 'pitch', midi: null, rms, confidence: 0 });
      return;
    }

    const rawHz = this._yin(this._buffer, sampleRate);
    if (rawHz === null) {
      this.port.postMessage({ type: 'pitch', midi: null, rms, confidence: 0 });
      return;
    }

    const midi = 12 * Math.log2(rawHz / 440) + 69;
    this.port.postMessage({ type: 'pitch', midi, rms, confidence: 1.0 });
  }

  // Pure YIN logic inside worklet to avoid Safari module import issues
  _yin(buf, sr) {
    const n = buf.length;
    const half = Math.floor(n / 2);
    const lagMin = Math.floor(sr / MAX_FREQ);
    const lagMax = Math.min(Math.ceil(sr / MIN_FREQ), half - 1);

    const diff = new Float32Array(half);
    for (let t = lagMin; t <= lagMax; t++) {
      let s = 0;
      for (let j = 0; j < half; j++) {
        const d = buf[j] - buf[j + t];
        s += d * d;
      }
      diff[t] = s;
    }

    const cmndf = new Float32Array(half);
    cmndf[0] = 1;
    let runSum = 0;
    for (let t = 1; t < half; t++) {
      runSum += diff[t];
      cmndf[t] = runSum > 0 ? diff[t] * t / runSum : 1;
    }

    let t_best = -1;
    for (let t = lagMin; t <= lagMax; t++) {
      if (cmndf[t] < YIN_THRESHOLD) {
        while (t + 1 <= lagMax && cmndf[t + 1] < cmndf[t]) t++;
        t_best = t;
        break;
      }
    }

    if (t_best < 0) {
      let minVal = Infinity;
      for (let t = lagMin; t <= lagMax; t++) {
        if (cmndf[t] < minVal) { minVal = cmndf[t]; t_best = t; }
      }
      if (minVal > 0.35) return null;
    }

    const prev = t_best > 0 ? cmndf[t_best - 1] : cmndf[t_best];
    const cur = cmndf[t_best];
    const next = t_best < half - 1 ? cmndf[t_best + 1] : cmndf[t_best];

    const denom = prev - 2 * cur + next;
    const tAccurate = denom !== 0 ? t_best + (prev - next) / (2 * denom) : t_best;

    return sr / tAccurate;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
