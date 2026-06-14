/**
 * MAIN — App initialization and orchestration.
 *
 * This is the single entry point. It wires together all modules:
 * state ↔ audio ↔ scheduler ↔ UI ↔ keyboard.
 *
 * New features implemented here:
 *  • U1: Keyboard note entry (via keyboard.js)
 *  • U4: Tap tempo
 *  • U7: URL share / restore from URL hash
 *  • PWA install prompt
 */

import { get, set, subscribe, persistSaved, snapshot } from './state.js';

import { ensureAudio, getCtx, noteFreq }     from './audio/context.js';
import { playSynth }                          from './audio/synth.js';
import { playSample, loadSamplesForInstrument, isLoaded, callbacks as samplerCb } from './audio/sampler.js';
import { startTanpura, stopTanpura }          from './audio/tanpura.js';

import { Scheduler }                          from './engine/scheduler.js';
import { buildSequence, stampDurations, buildShiftQueue, buildSingleShiftQueue } from './engine/sequence.js';

import { getSw }                              from './data/swaras.js';
import { THAATS }                             from './data/thaats.js';

import { renderSwaraPalette, highlightPaletteNote }                 from './ui/palette.js';
import { renderPattern, highlightPatternNote, renderFlowNotes, highlightFlowNote } from './ui/pattern.js';
import { renderPresetsFilter, renderPresets }                       from './ui/presets-ui.js';
import { initThaatSelect, getThaatSelectValue, renderThaatStrip,
         renderGenInput, renderGenResults, highlightGenRow,
         showGenPlaybackStrip, highlightGenStripNote, hideGenPlayback } from './ui/generator.js';
import { initPlaybackUI, updatePlayBtn, updateLoopUI, setNowNote,
         resetNowNote, setProgress, resetProgress, setStatPill,
         setCyclePill, resetCyclePill, setTempoPill, setPitchPill,
         initBeatDots, updateBeatDots, resetBeatDots,
         renderPitchGrid, setActivePitch, renderSaved }             from './ui/playback.js';
import { initViz, setVizPlaying, vizPulse }                        from './ui/viz.js';

import { initKeyboard }                       from './keyboard.js';

// ── Tala engine + UI ─────────────────────────────────────────────────────
import { createTalaEngine, getTalaEngine }  from './tala/engine.js';
import { TALAS }                            from './tala/definitions.js';
import { initTalaUI, renderTalaSelector, renderBolStrip, renderAvartaRing,
         highlightBolCell, resetBolStrip, updateAvartaRing,
         updateTalaBeatCounter, updateTalaCycleCounter,
         updateTalaStartBtn, updateTalaStatus, setTalaDisplay,
         setMuteButtons, toggleRiyazPanel,
         updateRiyazProgress, markRiyazComplete }  from './ui/tala-ui.js';

// ── Scheduler instance ────────────────────────────────────────────────────
const scheduler = new Scheduler(() => getCtx());

// ── Beat phase ────────────────────────────────────────────────────────────
let _beatPhase = 0;
let _playQueueLength = 0;
let _shiftMap = null;

// ── Tap tempo (U4) ────────────────────────────────────────────────────────
const _tapTimes = [];
function tapTempo() {
  const now = performance.now();
  _tapTimes.push(now);
  if (_tapTimes.length > 8) _tapTimes.shift();
  if (_tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < _tapTimes.length; i++) intervals.push(_tapTimes[i] - _tapTimes[i - 1]);
    const avgMs = intervals.reduce((a, b) => a + b) / intervals.length;
    const bpm   = Math.round(60000 / avgMs);
    setTempo(Math.max(30, Math.min(500, bpm)));
    showToast(`Tap: ${get('tempo')} BPM`);
  }
}

// ── URL Share (U7) ────────────────────────────────────────────────────────
function sharePattern() {
  const s = snapshot();
  if (!s.pattern.length) { showToast('Add notes first!'); return; }
  try {
    const data    = { pattern: s.pattern, tempo: s.tempo, basePitch: s.basePitch };
    const encoded = btoa(JSON.stringify(data));
    const url     = `${location.origin}${location.pathname}#p=${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copied!'));
    } else {
      prompt('Copy this link:', url);
    }
  } catch { showToast('Could not generate link'); }
}

function _restoreFromUrl() {
  try {
    const match = location.hash.match(/#p=(.+)/);
    if (!match) return;
    const data = JSON.parse(atob(match[1]));
    if (data.pattern?.length) {
      set('pattern', data.pattern);
      if (data.tempo)     setTempo(data.tempo);
      if (data.basePitch !== undefined) setBasePitch(data.basePitch);
      renderPattern(get('pattern'), { onRemove, onPreview: previewNote });
      renderFlowNotes(get('pattern'), get('direction'), get('repeats'));
      showToast('✓ Pattern loaded from link!');
    }
  } catch { /* malformed URL — ignore */ }
}

// ── Audio helpers ─────────────────────────────────────────────────────────

function playNote(freq, dur, t) {
  const wave = get('wave');
  // Try real samples first; fall back to synthesis if not loaded
  if (isLoaded(wave) && playSample(wave, freq, dur, t)) return;
  playSynth(wave, freq, dur, t);
}

function previewNote(note) {
  ensureAudio();
  const ctx = getCtx(); if (!ctx) return;
  const sw  = getSw(note.id ?? note);
  if (!sw) return;
  const freq = noteFreq(get('basePitch') + sw.semit, get('startOctave') + (note.o ?? 0));
  playNote(freq, 0.35, ctx.currentTime);
}

// ── Playback ──────────────────────────────────────────────────────────────

function togglePlay() { get('playing') ? stopPlay() : startPlay(); }

function startPlay() {
  const pattern = get('pattern');
  if (!pattern.length) { showToast('Add notes to the pattern first!'); return; }
  ensureAudio();
  if (get('tanpuraOn')) _restartTanpura();

  set('playing', true);
  set('isGenPlay', false);
  _shiftMap = null;

  const queue = stampDurations(
    buildSequence(pattern, get('direction'), get('repeats')),
    get('tempo')
  );
  _playQueueLength = queue.length;
  _beatPhase = 0;

  updatePlayBtn(true);
  setVizPlaying(true);
  renderFlowNotes(pattern, get('direction'), get('repeats'));

  scheduler.start(queue, {
    onSchedule: (note, t, idx, dur) => {
      const sw   = getSw(note.id); if (!sw) return;
      const freq = noteFreq(get('basePitch') + sw.semit, get('startOctave') + (note.o ?? 0));
      playNote(freq, dur * 0.9, t);
    },
    onUINote: (note, idx) => {
      const sw = getSw(note.id); if (!sw) return;
      const octMark = note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '';
      const durMark = note.dur === 2 ? ' ·' : note.dur === 0.5 ? '·' : '';
      setNowNote(octMark + sw.label + durMark);

      const patIdx = idx % Math.max(pattern.length, 1);
      highlightPatternNote(patIdx);
      highlightFlowNote(idx);
      highlightPaletteNote(note.id);
      setStatPill(`Note ${patIdx + 1}/${pattern.length}`);
      setCyclePill(idx + 1, _playQueueLength);
      setProgress(((idx + 1) / _playQueueLength) * 100);

      _beatPhase = (_beatPhase + 1) % get('beatType');
      updateBeatDots(_beatPhase);
      vizPulse();
    },
    onComplete: () => {
      if (get('loop')) return; // scheduler handles loop internally
      stopPlay();
      showToast('Alankar complete! 🎵');
    },
    loop: get('loop'),
  });
}

function startPlayCustom(queue, shiftMap) {
  ensureAudio();
  if (get('tanpuraOn')) _restartTanpura();

  set('playing', true);
  set('isGenPlay', true);
  _shiftMap = shiftMap;
  _playQueueLength = queue.length;
  _beatPhase = 0;

  stampDurations(queue, get('tempo'));
  updatePlayBtn(true);
  setVizPlaying(true);

  let lastShiftIdx = -1;

  scheduler.start(queue, {
    onSchedule: (note, t, idx, dur) => {
      const sw   = getSw(note.id); if (!sw) return;
      const freq = noteFreq(get('basePitch') + sw.semit, get('startOctave') + (note.o ?? 0));
      playNote(freq, dur * 0.9, t);
    },
    onUINote: (note, idx) => {
      const sw = getSw(note.id); if (!sw) return;
      const octMark = note.o === -1 ? '₋' : note.o === 1 ? '⁺' : '';
      setNowNote(octMark + sw.label);
      highlightPaletteNote(note.id);
      setCyclePill(idx + 1, _playQueueLength);
      setProgress(((idx + 1) / _playQueueLength) * 100);
      vizPulse();
      _beatPhase = (_beatPhase + 1) % get('beatType');
      updateBeatDots(_beatPhase);

      const m = _shiftMap?.[idx];
      if (m) {
        highlightGenRow(m.shiftIdx, m.noteIdx);
        setStatPill(`Shift ${m.shiftIdx + 1}`);
        if (m.shiftIdx !== lastShiftIdx) {
          lastShiftIdx = m.shiftIdx;
          showGenPlaybackStrip(get('generatedShifts')[m.shiftIdx], m.shiftIdx);
        }
        highlightGenStripNote(m.noteIdx);
      }
    },
    onComplete: () => {
      stopPlay();
    },
    loop: false,
  });
}

function stopPlay() {
  scheduler.stop();
  set('playing', false);
  set('isGenPlay', false);
  _shiftMap = null;

  updatePlayBtn(false);
  setVizPlaying(false);
  resetNowNote();
  resetProgress();
  setStatPill('Ready');
  resetCyclePill(get('repeats'));
  resetBeatDots();
  highlightPaletteNote(null);
  document.querySelectorAll('.pattern-note').forEach(el => el.classList.remove('playing-note'));
  document.querySelectorAll('.flow-note').forEach(el => el.classList.remove('active', 'played'));
  hideGenPlayback();
}

// ── Controls ──────────────────────────────────────────────────────────────

function setTempo(v) {
  const t = Math.max(30, Math.min(500, parseInt(v)));
  set('tempo', t);
  const disp   = document.getElementById('tempoDisplay');
  const slider = document.getElementById('tempoSlider');
  if (disp)   disp.textContent = t;
  if (slider) slider.value     = t;
  setTempoPill(t);
}

function adjustTempo(d) { setTempo(get('tempo') + d); }
function halfSpeed()   { setTempo(Math.max(30, Math.round(get('tempo') / 2))); showToast(`½×: ${get('tempo')} BPM`); }
function doubleSpeed() { setTempo(Math.min(500, Math.round(get('tempo') * 2))); showToast(`2×: ${get('tempo')} BPM`); }

function setBeatType(n) {
  set('beatType', n);
  document.querySelectorAll('.beat-type-btn[data-beats]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.beats) === n);
  });
  initBeatDots(n);
}

function setDirection(dir) {
  set('direction', dir);
  document.querySelectorAll('.dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === dir));
  renderFlowNotes(get('pattern'), dir, get('repeats'));
}

function adjustRepeats(d) {
  const r = Math.max(1, Math.min(20, get('repeats') + d));
  set('repeats', r);
  document.getElementById('repeatVal').textContent = r;
  resetCyclePill(r);
  renderFlowNotes(get('pattern'), get('direction'), r);
}

function setOctave(oct) {
  set('startOctave', 4 + oct);
  document.querySelectorAll('.oct-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.oct) === oct));
  if (get('tanpuraOn')) _restartTanpura();
}

function setBasePitch(idx) {
  set('basePitch', idx);
  setActivePitch(idx);
  setPitchPill(idx);
  if (get('tanpuraOn')) _restartTanpura();
}

function setWave(w) {
  set('wave', w);
  document.querySelectorAll('.wave-btn').forEach(b => b.classList.toggle('active', b.dataset.wave === w));
  // Trigger smart sample loading for this instrument
  ensureAudio();
  loadSamplesForInstrument(w);
}

function setNextOct(off) {
  set('nextOctOffset', off);
  document.querySelectorAll('#octOffBtns .seg-btn').forEach(b => {
    b.classList.toggle('active-oct', parseFloat(b.dataset.off) === off);
  });
}

function setNextDur(dur) {
  set('nextDur', dur);
  document.querySelectorAll('#durBtns .seg-btn').forEach(b => {
    b.classList.toggle('active-dur', parseFloat(b.dataset.dur) === dur);
  });
}

function toggleLoop() {
  const next = !get('loop');
  set('loop', next);
  updateLoopUI(next);
}

function setGenDirection(d) {
  set('genDirection', d);
  document.querySelectorAll('.beat-type-btn[data-gdir]').forEach(b => {
    b.classList.toggle('active', b.dataset.gdir === d);
  });
}

function adjustGenReps(d) {
  const r = Math.max(1, Math.min(10, get('genReps') + d));
  set('genReps', r);
  const el = document.getElementById('genRepsVal');
  if (el) el.textContent = r;
}

// ── Pattern ───────────────────────────────────────────────────────────────

function addNote(swaraId) {
  const pattern = [...get('pattern'), { id: swaraId, o: get('nextOctOffset'), dur: get('nextDur') }];
  set('pattern', pattern);
  renderPattern(pattern, { onRemove, onPreview: previewNote });
  renderFlowNotes(pattern, get('direction'), get('repeats'));
}

function onRemove(idx) {
  const pattern = [...get('pattern')];
  pattern.splice(idx, 1);
  set('pattern', pattern);
  if (get('playing')) stopPlay();
  renderPattern(pattern, { onRemove, onPreview: previewNote });
  renderFlowNotes(pattern, get('direction'), get('repeats'));
}

function undoLast() {
  const pattern = [...get('pattern')];
  if (!pattern.length) return;
  pattern.pop();
  set('pattern', pattern);
  renderPattern(pattern, { onRemove, onPreview: previewNote });
  renderFlowNotes(pattern, get('direction'), get('repeats'));
}

function clearPattern() {
  if (get('playing')) stopPlay();
  set('pattern', []);
  renderPattern([], { onRemove, onPreview: previewNote });
  renderFlowNotes([], get('direction'), get('repeats'));
}

function reversePattern() {
  const pattern = [...get('pattern')].reverse();
  set('pattern', pattern);
  renderPattern(pattern, { onRemove, onPreview: previewNote });
  renderFlowNotes(pattern, get('direction'), get('repeats'));
}

// ── Tanpura ───────────────────────────────────────────────────────────────

function toggleTanpura() {
  const on = document.getElementById('tanpuraToggle').checked;
  set('tanpuraOn', on);
  if (on) { ensureAudio(); _restartTanpura(); }
  else      stopTanpura();
}

function _restartTanpura() {
  if (!get('tanpuraOn')) return;
  const tuning = document.getElementById('tanpuraTuning')?.value ?? 'sa-pa';
  startTanpura(get('basePitch'), get('startOctave'), get('tanpuraVol'), tuning);
}

function setTanpuraVol(v) { set('tanpuraVol', v / 100); }

// ── Pattern Generator ─────────────────────────────────────────────────────

function onThaatChange(thaatName) {
  set('genInput', []);
  set('generatedShifts', []);
  renderThaatStrip(thaatName, item => {
    set('genInput', [...get('genInput'), item]);
    renderGenInput(get('genInput'), removeGenNote);
    previewNote({ id: item.id, o: 0 });
  });
  renderGenInput([], removeGenNote);
  const res = document.getElementById('genResults');
  if (res) {
    res.innerHTML = '';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:12px;color:var(--text3);text-align:center;padding:16px';
    hint.textContent = 'Select a thaat, build an input pattern, then click ⚡ Generate';
    res.appendChild(hint);
  }
}

function removeGenNote(idx) {
  const gi = [...get('genInput')];
  gi.splice(idx, 1);
  set('genInput', gi);
  renderGenInput(gi, removeGenNote);
}

function clearGenInput() {
  set('genInput', []);
  renderGenInput([], removeGenNote);
}

function generateShifts() {
  const gi = get('genInput');
  if (!gi.length) { showToast('Add notes to the input pattern first!'); return; }

  const thaatName = getThaatSelectValue();
  const thaat     = THAATS[thaatName];
  const tLen      = thaat.length;
  const startPos  = gi[0].thaatIdx;
  const intervals = gi.map(item => item.thaatIdx - startPos);

  const shifts = [];
  for (let shift = 0; shift < tLen; shift++) {
    const notes = intervals.map(interval => {
      const pos      = shift + interval;
      const noteIdx  = ((pos % tLen) + tLen) % tLen;
      const octOff   = pos >= 0 ? Math.floor(pos / tLen) : -Math.ceil(-pos / tLen);
      return { id: thaat[noteIdx], o: octOff, dur: 1 };
    });
    shifts.push(notes);
  }

  set('generatedShifts', shifts);
  renderGenResults(shifts, { onLoad: loadGenShift, onPlay: playGenShift });
  showToast(`Generated ${shifts.length} shifts for ${thaatName}!`);
}

function loadGenShift(idx) {
  if (get('playing')) stopPlay();
  const shift = get('generatedShifts')[idx];
  if (!shift) return;
  set('pattern', shift.map(n => ({ ...n })));
  renderPattern(get('pattern'), { onRemove, onPreview: previewNote });
  renderFlowNotes(get('pattern'), get('direction'), get('repeats'));
  showToast(`Loaded Shift ${idx + 1}`);
  document.querySelector('.pattern-track')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function playGenShift(idx) {
  if (get('playing')) stopPlay();
  const shift    = get('generatedShifts')[idx];
  if (!shift) return;
  const { queue, shiftMap } = buildSingleShiftQueue(shift, idx, get('genDirection'), get('genReps'));
  startPlayCustom(queue, shiftMap);
}

function playAllShifts() {
  const shifts = get('generatedShifts');
  if (!shifts.length) { showToast('Generate shifts first!'); return; }
  if (get('playing')) stopPlay();
  const { queue, shiftMap } = buildShiftQueue(shifts, get('genDirection'), get('genReps'));
  startPlayCustom(queue, shiftMap);
  showToast(`Playing all ${shifts.length} shifts!`);
}

// ── Save / Load ───────────────────────────────────────────────────────────

function openSaveModal() {
  const pattern = get('pattern');
  if (!pattern.length) { showToast('Pattern is empty!'); return; }
  document.getElementById('saveModal')?.classList.add('open');
  const inp = document.getElementById('saveNameInput');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 50); }
}

function closeSaveModal() {
  document.getElementById('saveModal')?.classList.remove('open');
}

function confirmSave() {
  const name    = document.getElementById('saveNameInput')?.value.trim() || 'My Alankar';
  const s       = snapshot();
  const saved   = [...s.savedAlankars, {
    name,
    pattern:   [...s.pattern],
    tempo:     s.tempo,
    direction: s.direction,
    repeats:   s.repeats,
  }];
  set('savedAlankars', saved);
  persistSaved();
  closeSaveModal();
  renderSaved(saved, { onLoad: loadSaved, onDelete: deleteSaved });
  showToast(`Saved: ${name}`);
}

function deleteSaved(idx) {
  const saved = [...get('savedAlankars')];
  saved.splice(idx, 1);
  set('savedAlankars', saved);
  persistSaved();
  renderSaved(saved, { onLoad: loadSaved, onDelete: deleteSaved });
}

function loadSaved(idx) {
  const a = get('savedAlankars')[idx];
  if (!a) return;
  if (get('playing')) stopPlay();
  set('pattern', [...(a.pattern ?? [])]);
  if (a.tempo)     setTempo(a.tempo);
  if (a.direction) setDirection(a.direction);
  if (a.repeats)   { set('repeats', a.repeats); document.getElementById('repeatVal').textContent = a.repeats; }
  renderPattern(get('pattern'), { onRemove, onPreview: previewNote });
  renderFlowNotes(get('pattern'), get('direction'), get('repeats'));
  showToast(`Loaded: ${a.name}`);
}

// ── Toast ─────────────────────────────────────────────────────────────────

let _toastTimer = null;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast show' + (isError ? ' error' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.classList.remove('show'); }, 2600);
}

// ── PWA Install ───────────────────────────────────────────────────────────
let _deferredInstall = null;

function _initPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstall = e;
    document.querySelector('.pwa-install-btn')?.classList.add('visible');
  });

  document.querySelector('.pwa-install-btn')?.addEventListener('click', async () => {
    if (!_deferredInstall) return;
    _deferredInstall.prompt();
    const { outcome } = await _deferredInstall.userChoice;
    if (outcome === 'accepted') {
      document.querySelector('.pwa-install-btn')?.classList.remove('visible');
    }
    _deferredInstall = null;
  });

  // Offline/online banner
  const banner = document.querySelector('.offline-banner');
  const update = () => { if (banner) banner.classList.toggle('visible', !navigator.onLine); };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ── Service Worker ────────────────────────────────────────────────────────
function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.warn('SW registration failed:', err);
  });
  // Listen for the new SW telling us it activated — prompt user to reload
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SW_UPDATED') {
      showToast('App updated! Reloading…', false);
      setTimeout(() => location.reload(), 1500);
    }
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────

function init() {
  // UI init
  initPlaybackUI();
  initViz();
  initBeatDots(get('beatType'));

  renderPitchGrid(get('basePitch'), setBasePitch);
  setPitchPill(get('basePitch'));
  setTempoPill(get('tempo'));

  const tempoDisplay = document.getElementById('tempoDisplay');
  const tempoSlider  = document.getElementById('tempoSlider');
  if (tempoDisplay) tempoDisplay.textContent = get('tempo');
  if (tempoSlider)  tempoSlider.value        = get('tempo');

  renderSwaraPalette({ onAdd: addNote, onPreview: id => previewNote({ id, o: 0 }) });
  renderPattern(get('pattern'), { onRemove, onPreview: previewNote });
  renderFlowNotes(get('pattern'), get('direction'), get('repeats'));
  renderPresetsFilter(null);
  renderPresets(p => {
    if (get('playing')) stopPlay();
    set('pattern', p.notes.map(n => ({ ...n })));
    renderPattern(get('pattern'), { onRemove, onPreview: previewNote });
    renderFlowNotes(get('pattern'), get('direction'), get('repeats'));
    showToast(`Loaded: ${p.name}`);
  });
  renderSaved(get('savedAlankars'), { onLoad: loadSaved, onDelete: deleteSaved });

  // Generator
  initThaatSelect(onThaatChange);
  renderThaatStrip('Bilawal', item => {
    set('genInput', [...get('genInput'), item]);
    renderGenInput(get('genInput'), removeGenNote);
    previewNote({ id: item.id, o: 0 });
  });
  renderGenInput([], removeGenNote);

  // Wire static HTML buttons
  _wireButtons();

  // Keyboard
  initKeyboard({
    addNote,
    togglePlay,
    undoLast,
    clearPattern,
    adjustTempo,
    halfSpeed,
    doubleSpeed,
    tapTempo,
    toggleLoop,
    sharePattern,
  });

  // Modal
  const saveNameInput = document.getElementById('saveNameInput');
  saveNameInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter')  confirmSave();
    if (e.key === 'Escape') closeSaveModal();
  });
  document.getElementById('saveModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSaveModal();
  });

  // Audio context — prime on first user interaction
  const primer = () => { ensureAudio(); loadSamplesForInstrument(get('wave')); document.removeEventListener('click', primer); };
  document.addEventListener('click', primer);
  // Also prime after 1s (for desktop users who haven't clicked yet but play immediately)
  setTimeout(() => { try { ensureAudio(); loadSamplesForInstrument(get('wave')); } catch {/**/} }, 800);

  // Sampler status callback
  samplerCb.onStatus = (msg, isLoaded) => {
    const el = document.getElementById('sampleStatus');
    if (!el) return;
    el.textContent = msg;
    el.className   = `sample-status${isLoaded ? ' loaded' : ''}`;
  };

  // Tap tempo button
  document.getElementById('tapBtn')?.addEventListener('click', tapTempo);

  // Share button
  document.getElementById('shareBtn')?.addEventListener('click', sharePattern);

  // PWA
  _initPWA();
  _registerSW();

  // Restore pattern from URL if present
  _restoreFromUrl();

  // Tala Companion
  initTalaUI();
  _initTala();
}

function _wireButtons() {
  // Play buttons
  document.getElementById('playBtn')?.addEventListener('click', togglePlay);
  document.getElementById('buildPlayBtn')?.addEventListener('click', togglePlay);
  document.getElementById('loopBtn')?.addEventListener('click', toggleLoop);
  document.getElementById('loopPill')?.addEventListener('click', toggleLoop);

  // Octave
  document.querySelectorAll('.oct-btn').forEach(b => {
    b.addEventListener('click', () => setOctave(parseInt(b.dataset.oct)));
  });

  // Tempo
  document.getElementById('tempoSlider')?.addEventListener('input', e => setTempo(e.target.value));
  document.querySelectorAll('.tempo-adj[data-adj]').forEach(b => {
    b.addEventListener('click', () => adjustTempo(parseInt(b.dataset.adj)));
  });
  document.querySelector('.speed-btn[data-speed="half"]')?.addEventListener('click', halfSpeed);
  document.querySelector('.speed-btn[data-speed="double"]')?.addEventListener('click', doubleSpeed);

  // Beat type
  document.querySelectorAll('.beat-type-btn[data-beats]').forEach(b => {
    b.addEventListener('click', () => setBeatType(parseInt(b.dataset.beats)));
  });

  // Note opts
  document.querySelectorAll('#durBtns .seg-btn').forEach(b => {
    b.addEventListener('click', () => setNextDur(parseFloat(b.dataset.dur)));
  });
  document.querySelectorAll('#octOffBtns .seg-btn').forEach(b => {
    b.addEventListener('click', () => setNextOct(parseFloat(b.dataset.off)));
  });

  // Direction
  document.querySelectorAll('.dir-btn').forEach(b => {
    b.addEventListener('click', () => setDirection(b.dataset.dir));
  });

  // Repeats
  document.querySelectorAll('.repeat-adj').forEach(b => {
    b.addEventListener('click', () => adjustRepeats(parseInt(b.dataset.adj)));
  });

  // Wave
  document.querySelectorAll('.wave-btn').forEach(b => {
    b.addEventListener('click', () => setWave(b.dataset.wave));
  });

  // Tanpura
  document.getElementById('tanpuraToggle')?.addEventListener('change', toggleTanpura);
  document.getElementById('tanpuraTuning')?.addEventListener('change', _restartTanpura);
  document.getElementById('tanpuraVol')?.addEventListener('input', e => setTanpuraVol(e.target.value));

  // Pattern actions
  document.getElementById('undoBtn')?.addEventListener('click', undoLast);
  document.getElementById('clearBtn')?.addEventListener('click', clearPattern);
  document.getElementById('reverseBtn')?.addEventListener('click', reversePattern);
  document.getElementById('saveBtn')?.addEventListener('click', openSaveModal);

  // Modal
  document.getElementById('cancelSaveBtn')?.addEventListener('click', closeSaveModal);
  document.getElementById('confirmSaveBtn')?.addEventListener('click', confirmSave);

  // Generator
  document.getElementById('generateBtn')?.addEventListener('click', generateShifts);
  document.getElementById('playAllBtn')?.addEventListener('click', playAllShifts);
  document.getElementById('clearGenBtn')?.addEventListener('click', clearGenInput);

  // Gen reps
  document.querySelectorAll('.gen-rep-adj').forEach(b => {
    b.addEventListener('click', () => adjustGenReps(parseInt(b.dataset.adj)));
  });

  // Gen direction
  document.querySelectorAll('.beat-type-btn[data-gdir]').forEach(b => {
    b.addEventListener('click', () => setGenDirection(b.dataset.gdir));
  });

  // ── Tala controls ──────────────────────────────────────────────────────
  document.getElementById('talaSelect')?.addEventListener('change', e => {
    set('talaName', e.target.value);
    _switchTala(e.target.value);
  });

  document.getElementById('talaStartBtn')?.addEventListener('click', _toggleTala);

  document.getElementById('talaBPMSlider')?.addEventListener('input', e => {
    _setTalaTempo(parseInt(e.target.value));
  });

  document.querySelectorAll('[data-talabpm]').forEach(b => {
    b.addEventListener('click', () => {
      _setTalaTempo(get('talaTempo') + parseInt(b.dataset.talabpm));
    });
  });

  document.getElementById('talaVol')?.addEventListener('input', e => {
    const v = e.target.value / 100;
    set('talaVolume', v);
    getTalaEngine()?.setVolume(v);
  });

  document.getElementById('muteBayanBtn')?.addEventListener('click', () => {
    const next = !get('talaMuteBayan');
    set('talaMuteBayan', next);
    const eng = getTalaEngine();
    if (eng) eng.muteBayan = next;
    setMuteButtons(next, get('talaMuteDayan'));
  });

  document.getElementById('muteDayanBtn')?.addEventListener('click', () => {
    const next = !get('talaMuteDayan');
    set('talaMuteDayan', next);
    const eng = getTalaEngine();
    if (eng) eng.muteDayan = next;
    setMuteButtons(get('talaMuteBayan'), next);
  });

  document.getElementById('humanizeSlider')?.addEventListener('input', e => {
    const v = e.target.value / 1000; // ms → seconds
    set('talaHumanize', v);
    const eng = getTalaEngine();
    if (eng) eng.humanize = v;
  });

  document.getElementById('riyazToggle')?.addEventListener('change', e => {
    toggleRiyazPanel(e.target.checked);
    set('riyazEnabled', e.target.checked);
  });

  document.getElementById('riyazStartRiyazBtn')?.addEventListener('click', _toggleRiyaz);
}

// ── Tala engine functions ─────────────────────────────────────────────────

let _talaEngine = null;

function _initTala() {
  _talaEngine = createTalaEngine(() => { ensureAudio(); return getCtx(); });

  const talaName = get('talaName');

  renderTalaSelector(talaName, name => {
    set('talaName', name);
    _switchTala(name);
  });
  renderBolStrip(talaName);
  renderAvartaRing(talaName);
  setTalaDisplay(get('talaTempo'));

  _talaEngine.onBeat = (beatIdx, bol, isSam, isKhali, cycleNum) => {
    const tala = TALAS[get('talaName')];
    if (!tala) return;

    highlightBolCell(beatIdx, isSam, isKhali);
    updateAvartaRing(get('talaName'), beatIdx, isSam);
    updateTalaBeatCounter(beatIdx, tala.beats);
    updateTalaCycleCounter(cycleNum);

    const statusText = isSam ? '✕ Sam' : isKhali ? '○ Khali' : bol;
    updateTalaStatus(statusText, isSam ? 'sam' : 'running');

    // Pulse the viz on sam
    if (isSam) vizPulse();
  };

  _talaEngine.onCycle = cycleNum => {
    updateTalaCycleCounter(cycleNum);
    resetBolStrip();
  };

  _talaEngine.onTempoChange = bpm => {
    if (bpm === 'done') { markRiyazComplete(); return; }
    _setTalaTempo(bpm, false); // false = don't update engine again
    const rStart  = parseInt(document.getElementById('riyazStartBPM')?.value  ?? 60);
    const rTarget = parseInt(document.getElementById('riyazTargetBPM')?.value ?? 140);
    updateRiyazProgress(bpm, rStart, rTarget);
    showToast(`Riyaz: ${Math.round(bpm)} BPM`);
  };
}

function _switchTala(talaName) {
  const wasRunning = get('talaRunning');
  if (wasRunning) {
    _talaEngine.stop();
  }
  renderBolStrip(talaName);
  renderAvartaRing(talaName);
  resetBolStrip();
  updateTalaStatus('Stopped');
  updateTalaBeatCounter(0, TALAS[talaName]?.beats ?? 0);
  updateTalaCycleCounter(0);
  if (wasRunning) {
    _startTala();
  }
}

function _toggleTala() {
  if (get('talaRunning')) _stopTala();
  else _startTala();
}

function _startTala() {
  ensureAudio();
  set('talaRunning', true);

  _talaEngine.volume    = get('talaVolume');
  _talaEngine.muteBayan = get('talaMuteBayan');
  _talaEngine.muteDayan = get('talaMuteDayan');
  _talaEngine.humanize  = get('talaHumanize');

  _talaEngine.start(get('talaName'), get('talaTempo'));

  updateTalaStartBtn(true);
  updateTalaStatus('Running…', 'running');
  document.getElementById('talaActiveDot')?.classList.add('on');
}

function _stopTala() {
  _talaEngine.stop();
  set('talaRunning', false);
  updateTalaStartBtn(false);
  updateTalaStatus('Stopped');
  resetBolStrip();
  document.getElementById('talaActiveDot')?.classList.remove('on');
}

function _setTalaTempo(bpm, updateEngine = true) {
  const t = Math.max(20, Math.min(400, Math.round(bpm)));
  set('talaTempo', t);
  setTalaDisplay(t);
  if (updateEngine) getTalaEngine()?.setTempo(t);
}

let _riyazRunning = false;
function _toggleRiyaz() {
  const btn = document.getElementById('riyazStartRiyazBtn');
  if (_riyazRunning) {
    _riyazRunning = false;
    btn?.classList.remove('active');
    if (btn) btn.textContent = '⚡ Start Riyaz';
    getTalaEngine()?.setRiyazMode({ enabled: false });
    showToast('Riyaz stopped');
  } else {
    _riyazRunning = true;
    btn?.classList.add('active');
    if (btn) btn.textContent = '⏹ Stop Riyaz';
    const startBPM  = parseInt(document.getElementById('riyazStartBPM')?.value  ?? 60);
    const targetBPM = parseInt(document.getElementById('riyazTargetBPM')?.value ?? 140);
    const stepBPM   = parseInt(document.getElementById('riyazStepBPM')?.value   ?? 5);
    const stepSec   = parseInt(document.getElementById('riyazIntervalSec')?.value ?? 30);
    getTalaEngine()?.setRiyazMode({ enabled:true, startBPM, targetBPM, stepBPM, stepIntervalSec: stepSec });
    if (!get('talaRunning')) _startTala();
    showToast(`Riyaz: ${startBPM} → ${targetBPM} BPM`);
  }
}

document.addEventListener('DOMContentLoaded', init);

