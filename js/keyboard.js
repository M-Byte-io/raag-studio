/**
 * KEYBOARD — Global keyboard shortcuts.
 *
 * New in this version (U1, U4):
 *  • Note entry: s r R g G m M p d D n N ' → add swara to pattern
 *  • T → tap tempo
 *  • Space → play/stop
 *  • Backspace → undo last note
 *  • Delete → clear pattern
 *  • ↑/↓ → +/- 5 BPM
 *  • L → toggle loop
 *  • [ → half speed
 *  • ] → double speed
 *  • Shift+S → share pattern (URL)
 */

import { KEY_TO_SWARA } from './data/swaras.js';

let _handlers = {};

/** Register all keyboard handlers. Call once at app init. */
export function initKeyboard(handlers) {
  _handlers = handlers;
  document.addEventListener('keydown', _onKey);
}

function _onKey(e) {
  // Skip when user is typing in an input field
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  const key = e.key;

  // ── Note entry (U1) ────────────────────────────────────────────────────
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (KEY_TO_SWARA[key]) {
      e.preventDefault();
      _handlers.addNote?.(KEY_TO_SWARA[key]);
      return;
    }
  }

  // ── Playback ─────────────────────────────────────────────────────────────
  if (e.code === 'Space') { e.preventDefault(); _handlers.togglePlay?.(); return; }

  // ── Pattern editing ───────────────────────────────────────────────────────
  if (e.code === 'Backspace') { e.preventDefault(); _handlers.undoLast?.();     return; }
  if (e.code === 'Delete')    { e.preventDefault(); _handlers.clearPattern?.(); return; }

  // ── Tempo ─────────────────────────────────────────────────────────────────
  if (e.code === 'ArrowUp')   { e.preventDefault(); _handlers.adjustTempo?.(5);   return; }
  if (e.code === 'ArrowDown') { e.preventDefault(); _handlers.adjustTempo?.(-5);  return; }
  if (e.code === 'BracketLeft')  { e.preventDefault(); _handlers.halfSpeed?.();   return; }
  if (e.code === 'BracketRight') { e.preventDefault(); _handlers.doubleSpeed?.(); return; }

  // ── Tap tempo (U4) — T key ────────────────────────────────────────────────
  if (e.code === 'KeyT') { e.preventDefault(); _handlers.tapTempo?.(); return; }

  // ── Loop ──────────────────────────────────────────────────────────────────
  if (e.code === 'KeyL') { _handlers.toggleLoop?.(); return; }

  // ── Share (U7) — Shift+S ──────────────────────────────────────────────────
  if (e.code === 'KeyS' && e.shiftKey) { e.preventDefault(); _handlers.sharePattern?.(); return; }
}
