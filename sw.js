/**
 * SERVICE WORKER — Raag Studio PWA v3
 *
 * Strategy:
 *  • HTML (navigation): Network-first → fallback to cache (always fresh shell)
 *  • CSS / JS assets: Cache-first → fallback to network
 *  • Audio samples: Pass-through (handled by IndexedDB in the app)
 *
 * Cache versioning: bump CACHE_NAME on every deployment to force
 * clients to re-fetch the app shell and invalidate all stale caches.
 */

const CACHE_NAME = 'raag-studio-v3';

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
  // Skip waiting — take control immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate: Delete ALL old caches and claim all clients ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // Force all open tabs to use the new SW immediately
      return self.clients.claim();
    }).then(() => {
      // Tell all clients to reload so they get the new HTML
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass-through: audio samples (app caches these via IndexedDB)
  if (url.hostname === 'raw.githubusercontent.com') return;

  // Pass-through: Google Fonts (CDN)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // HTML navigation: network-first so we always serve fresh HTML
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match('/index.html');
        })
    );
  } else {
    // CSS / JS / images: cache-first for performance
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
    );
  }
});
