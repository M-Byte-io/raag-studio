/**
 * SERVICE WORKER — Raag Studio PWA
 *
 * Strategy:
 *  • App shell (HTML/CSS/JS): Cache-first with network fallback.
 *  • Audio samples: NOT cached by SW — handled by IndexedDB in the app.
 *  • Navigation fallback: serves index.html for any non-matching navigate request.
 *
 * Cache versioning: bump CACHE_NAME on every deployment to force
 * clients to re-fetch the app shell.
 */

const CACHE_NAME = 'raag-studio-shell-v2';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/tokens.css',
  '/css/animations.css',
  '/css/layout.css',
  '/css/components.css',
  '/js/main.js',
  '/js/state.js',
  '/js/keyboard.js',
  '/js/data/swaras.js',
  '/js/data/thaats.js',
  '/js/data/presets.js',
  '/js/audio/context.js',
  '/js/audio/synth.js',
  '/js/audio/sampler.js',
  '/js/audio/tanpura.js',
  '/js/engine/scheduler.js',
  '/js/engine/sequence.js',
  '/js/ui/palette.js',
  '/js/ui/pattern.js',
  '/js/ui/presets-ui.js',
  '/js/ui/generator.js',
  '/js/ui/playback.js',
  '/js/ui/viz.js',
  '/js/tala/definitions.js',
  '/js/tala/synth.js',
  '/js/tala/engine.js',
  '/js/ui/tala-ui.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ── Install: Precache app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(err => console.warn('[SW] Precache partial failure:', err))
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: Clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch: Cache-first for app shell, pass-through for external ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Let audio sample requests pass through — app handles these via IDB
  if (url.hostname === 'raw.githubusercontent.com') return;

  // Let Google Fonts pass through (CDN, always online, not worth caching in SW)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return;

  // Cache-first strategy for same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        // Not in cache — fetch from network and cache it
        return fetch(request).then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // Offline and not in cache — serve index.html for navigate requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Return empty 408 for other resources that fail offline
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
    );
  }
});
