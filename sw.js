/**
 * SERVICE WORKER — Raag Studio PWA v4
 *
 * Dynamically computes BASE from sw.js location so this works at ANY
 * subpath (e.g. /raag-studio/ on GitHub Pages, or / on Vercel).
 *
 * Strategy:
 *  • HTML navigation → network-first (always fresh shell)
 *  • CSS / JS / icons → cache-first (fast, revalidated on deploy)
 *  • Audio samples → pass-through (IndexedDB handles these)
 */

// Derive the base path from where this SW file is located.
// On GitHub Pages: self.location.pathname = '/raag-studio/sw.js'  → BASE = '/raag-studio/'
// On Vercel/root:  self.location.pathname = '/sw.js'              → BASE = '/'
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const CACHE_NAME = 'raag-studio-v4';

const SHELL_ASSETS = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}css/tokens.css`,
  `${BASE}css/animations.css`,
  `${BASE}css/layout.css`,
  `${BASE}css/components.css`,
  `${BASE}js/main.js`,
  `${BASE}js/state.js`,
  `${BASE}js/keyboard.js`,
  `${BASE}js/data/swaras.js`,
  `${BASE}js/data/thaats.js`,
  `${BASE}js/data/presets.js`,
  `${BASE}js/audio/context.js`,
  `${BASE}js/audio/synth.js`,
  `${BASE}js/audio/sampler.js`,
  `${BASE}js/audio/tanpura.js`,
  `${BASE}js/engine/scheduler.js`,
  `${BASE}js/engine/sequence.js`,
  `${BASE}js/ui/palette.js`,
  `${BASE}js/ui/pattern.js`,
  `${BASE}js/ui/presets-ui.js`,
  `${BASE}js/ui/generator.js`,
  `${BASE}js/ui/playback.js`,
  `${BASE}js/ui/viz.js`,
  `${BASE}js/tala/definitions.js`,
  `${BASE}js/tala/synth.js`,
  `${BASE}js/tala/engine.js`,
  `${BASE}js/ui/tala-ui.js`,
  `${BASE}icons/icon-192.svg`,
  `${BASE}icons/icon-512.svg`,
];

// ── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(err => console.warn('[SW] Precache partial failure:', err))
  );
  self.skipWaiting();
});

// ── Activate: delete all old caches, claim clients ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      }))
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass-through: audio samples (IndexedDB)
  if (url.hostname === 'raw.githubusercontent.com') return;

  // Pass-through: Google Fonts
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  // Only handle same-origin requests under our base path
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE.replace(/\/$/, '') || '/')) return;

  if (request.mode === 'navigate') {
    // HTML: network-first so shell is always fresh
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(`${BASE}index.html`))
    );
  } else {
    // Assets: cache-first
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
  }
});
