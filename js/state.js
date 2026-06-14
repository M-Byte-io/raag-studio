/**
 * RAAG STUDIO — Centralized State Manager
 *
 * A lightweight pub/sub store. All mutable state lives here.
 * Components subscribe to keys they care about; mutations
 * automatically notify all subscribers.
 *
 * Usage:
 *   import { get, set, subscribe } from './state.js';
 *   const tempo = get('tempo');
 *   set('tempo', 120);
 *   const unsub = subscribe('tempo', v => console.log('tempo:', v));
 *   unsub(); // stop listening
 */

/** @type {Map<string, Function[]>} */
const _listeners = new Map();

/** Core state object — never mutated directly from outside this module. */
const _state = {
  // Pitch / tuning
  basePitch:    0,       // 0=C, 1=C#, … 11=B
  startOctave:  4,       // MIDI octave of Sa

  // Playback
  tempo:     80,         // BPM [30–500]
  direction: 'up',       // 'up' | 'down' | 'both'
  repeats:   1,          // number of cycles [1–20]
  loop:      false,      // infinite loop
  playing:   false,      // currently playing

  // Beat / rhythm
  beatType: 4,           // beats per cycle [3|4|5]

  // Notes
  pattern:       [],     // { id, o, dur }[]
  nextOctOffset: 0,      // -1 | 0 | 1
  nextDur:       1,      // 2 | 1 | 0.5

  // Instrument
  wave: 'sitar',         // 'sitar' | 'flute' | 'sarangi' | 'harmonium'

  // Tanpura
  tanpuraOn:  false,
  tanpuraVol: 0.3,

  // Pattern generator
  genInput:         [],  // { id, thaatIdx }[]
  generatedShifts:  [],  // Array of note arrays
  genReps:          1,
  genDirection:    'aaroh',
  isGenPlay:        false,
  _shiftMap:        null,

  // Persistence — loaded from localStorage at boot
  savedAlankars: _loadSaved(),

  // ── Tala engine ─────────────────────────────────────────
  talaRunning:   false,
  talaName:     'Teentaal',
  talaTempo:     80,
  talaVolume:    0.75,
  talaMuteBayan: false,
  talaMuteDayan: false,
  talaHumanize:  0.010,   // seconds of jitter
  riyazEnabled:  false,
};

/** @returns {any} */
export function get(key) {
  return _state[key];
}

/**
 * Update a state key and notify subscribers.
 * @param {string} key
 * @param {any} value
 */
export function set(key, value) {
  _state[key] = value;
  _notify(key, value);
}

/**
 * Subscribe to changes on a specific key.
 * @param {string} key
 * @param {Function} fn  Called with (newValue, key) on each change.
 * @returns {Function}   Call to unsubscribe.
 */
export function subscribe(key, fn) {
  if (!_listeners.has(key)) _listeners.set(key, []);
  _listeners.get(key).push(fn);
  return () => {
    const arr = _listeners.get(key);
    if (arr) _listeners.set(key, arr.filter(f => f !== fn));
  };
}

/** Snapshot of entire state (shallow copy). */
export function snapshot() { return { ..._state }; }

// ── Private ───────────────────────────────────────────────

function _notify(key, value) {
  _listeners.get(key)?.forEach(fn => fn(value, key));
}

function _loadSaved() {
  try {
    return JSON.parse(localStorage.getItem('raagStudioAlankars2') || '[]');
  } catch {
    return [];
  }
}

/** Persist savedAlankars to localStorage. */
export function persistSaved() {
  try {
    localStorage.setItem('raagStudioAlankars2', JSON.stringify(_state.savedAlankars));
  } catch {/* quota exceeded — fail silently */}
}
