/**
 * SAMPLER — Intelligent real-instrument sample loading with IndexedDB cache.
 *
 * Strategy (addresses P1 - 180 parallel fetches):
 *  1. On instrument selection: immediately load ONLY that instrument's samples.
 *  2. After primary instrument loads: background-load remaining instruments.
 *  3. All ArrayBuffers are cached in IndexedDB for future sessions (offline support).
 *  4. findNearest() picks closest loaded sample via pitch-shifting.
 *
 * Fixes C3 (race condition): playNote() checks per-instrument loading state,
 * not a single global flag, so switching instruments mid-phrase is safe.
 */

import { getCtx } from './context.js';

// ── Constants ─────────────────────────────────────────────────────────────

const SAMPLE_BASE = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/';

/** Available sample notes per instrument. */
const SAMPLE_NOTES = {
  harmonium:     ['A2','As2','B2','C2','Cs2','D2','Ds2','E2','F2','Fs2','G2','Gs2','A3','As3','B3','C3','Cs3','D3','Ds3','E3','F3','Fs3','G3','Gs3','A4','As4','B4','C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','C5','Cs5','D5'],
  flute:         ['A4','As4','B4','C4','Cs4','D4','Ds4','E4','F4','Fs4','G4','Gs4','A5','As5','B5','C5','Cs5','D5','Ds5','E5','F5','Fs5','G5','Gs5','A6','C6','E6'],
  violin:        ['A3','A4','A5','A6','C4','C5','C6','Cs5','D4','D5','Ds5','E4','E5','F4','Fs4','G4','Gs4','G5'],
  'guitar-nylon':['Fs2','Fs3','Fs4','Fs5','B1','B2','B3','B4','E2','E3','E4','E5'],
};

/** Maps instrument UI name → sample library name. */
const INST_MAP = {
  sitar:     'guitar-nylon',
  flute:     'flute',
  sarangi:   'violin',
  harmonium: 'harmonium',
};

// ── State ─────────────────────────────────────────────────────────────────

/** @type {Map<string, { buffer: AudioBuffer, midi: number }>} */
const audioBuffers = new Map();

/** Per-instrument loading state: 'idle' | 'loading' | 'loaded' | 'error' */
const instState = {
  'guitar-nylon': 'idle',
  flute:          'idle',
  violin:         'idle',
  harmonium:      'idle',
};

// ── IndexedDB Cache ───────────────────────────────────────────────────────

const DB_NAME    = 'raag-studio-samples-v1';
const STORE_NAME = 'buffers';

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME);
    req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise(resolve => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = ()  => resolve(null);
    });
  } catch { return null; }
}

async function idbPut(key, arrayBuffer) {
  try {
    const db = await openDB();
    await new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(arrayBuffer, key);
      tx.oncomplete = resolve;
      tx.onerror    = resolve; // fail silently
    });
  } catch {/* quota or private-browsing — ignore */}
}

// ── Note Name Utilities ───────────────────────────────────────────────────

const NOTE_OFFSETS = { C:0,Cs:1,D:2,Ds:3,E:4,F:5,Fs:6,G:7,Gs:8,A:9,As:10,B:11 };

function noteNameToMidi(n) {
  const m = n.match(/^([A-G]s?)(\d)$/);
  return m ? (parseInt(m[2]) + 1) * 12 + (NOTE_OFFSETS[m[1]] ?? 0) : 60;
}

// ── Sample Loading ────────────────────────────────────────────────────────

/** Load a single sample, checking IDB cache first. */
async function loadOneNote(libInst, note, onProgress) {
  const key = `${libInst}/${note}`;
  if (audioBuffers.has(key)) { onProgress?.(); return; }

  const ctx = getCtx();
  if (!ctx) return;

  try {
    // 1. Try IndexedDB cache (fast, offline-capable)
    let ab = await idbGet(key);

    if (!ab) {
      // 2. Network fetch
      const res = await fetch(`${SAMPLE_BASE}${libInst}/${note}.mp3`);
      if (!res.ok) { onProgress?.(); return; }
      ab = await res.arrayBuffer();
      // Store a copy in IDB (the original gets consumed by decodeAudioData)
      idbPut(key, ab.slice(0));
    }

    const buffer = await ctx.decodeAudioData(ab);
    audioBuffers.set(key, { buffer, midi: noteNameToMidi(note) });
  } catch {/* network error or decode failure — skip silently */}

  onProgress?.();
}

/**
 * Load all samples for one instrument.
 * @param {string} libInst  — library instrument name (e.g. 'guitar-nylon')
 * @param {Function} [onProgress]  — called after each note loaded
 */
async function loadInstrument(libInst, onProgress) {
  if (instState[libInst] === 'loaded' || instState[libInst] === 'loading') return;
  instState[libInst] = 'loading';

  const notes = SAMPLE_NOTES[libInst] ?? [];
  // Sequential loading to avoid saturating HTTP connection pool
  for (const note of notes) {
    await loadOneNote(libInst, note, onProgress);
  }

  instState[libInst] = 'loaded';
}

// ── Public API ────────────────────────────────────────────────────────────

/** Status callbacks set by UI */
export const callbacks = { onStatus: null };

/**
 * Load samples for the active instrument immediately, then
 * background-load remaining instruments.
 *
 * @param {string} uiInst  — instrument id as used in state ('sitar'|'flute'|'sarangi'|'harmonium')
 */
export async function loadSamplesForInstrument(uiInst) {
  const primary = INST_MAP[uiInst];
  if (!primary) return;

  // Count totals for progress reporting
  const primaryNotes   = SAMPLE_NOTES[primary]?.length ?? 0;
  const remainingTotal = Object.keys(INST_MAP)
    .map(k => INST_MAP[k])
    .filter((v, i, a) => v !== primary && a.indexOf(v) === i)
    .reduce((sum, inst) => sum + (SAMPLE_NOTES[inst]?.length ?? 0), 0);
  const grand = primaryNotes + remainingTotal;

  let done = 0;
  const progress = () => {
    done++;
    const pct = Math.round((done / grand) * 100);
    callbacks.onStatus?.(`Loading samples ${pct}%…`, false);
  };

  // Phase 1: load the selected instrument immediately
  callbacks.onStatus?.(`Loading ${uiInst} samples…`, false);
  await loadInstrument(primary, progress);
  callbacks.onStatus?.(`✓ ${uiInst} ready! Background loading others…`, true);

  // Phase 2: background-load remaining instruments without blocking playback
  queueMicrotask(async () => {
    const others = [...new Set(Object.values(INST_MAP))].filter(v => v !== primary);
    for (const inst of others) {
      await loadInstrument(inst, progress);
    }
    callbacks.onStatus?.('✓ All samples loaded & cached!', true);
  });
}

/**
 * Find the nearest loaded sample for a given instrument + MIDI note.
 * @param {string} libInst
 * @param {number} midi
 * @returns {{ buffer: AudioBuffer, midi: number }|null}
 */
export function findNearest(libInst, midi) {
  let best = null, bestDist = Infinity;
  for (const [k, v] of audioBuffers) {
    if (!k.startsWith(libInst + '/')) continue;
    const d = Math.abs(v.midi - midi);
    if (d < bestDist) { bestDist = d; best = v; }
  }
  return best;
}

/**
 * Play a real sample with pitch-shifting.
 * @param {string} uiInst  — UI instrument id
 * @param {number} freq    — desired frequency in Hz
 * @param {number} dur     — duration in seconds
 * @param {number} t       — AudioContext startTime
 * @returns {boolean}  true if sample was found and played
 */
export function playSample(uiInst, freq, dur, t) {
  const ctx = getCtx(); if (!ctx) return false;
  const lib = INST_MAP[uiInst];
  if (!lib) return false;

  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const s    = findNearest(lib, midi);
  if (!s) return false;

  const src = ctx.createBufferSource();
  src.buffer = s.buffer;
  src.playbackRate.value = Math.pow(2, (midi - s.midi) / 12);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.03);
  g.gain.setValueAtTime(0.5, t + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);

  src.connect(g); g.connect(ctx.destination);
  src.start(t); src.stop(t + dur + 0.3);
  return true;
}

/** Is the given UI instrument fully loaded? */
export function isLoaded(uiInst) {
  return instState[INST_MAP[uiInst]] === 'loaded';
}

/** Is the given UI instrument currently loading? */
export function isLoading(uiInst) {
  return instState[INST_MAP[uiInst]] === 'loading';
}
