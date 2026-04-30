// Puragenda Service Worker
// Exists solely to make the app installable as a PWA.
// Does NOT cache anything — always serves live content from the server.
// A SaaS app must always show real-time data.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clear any caches from previous versions
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Always fetch from the network — never serve cached content
self.addEventListener("fetch", () => {
  // Intentionally empty: let the browser handle all requests normally.
  // This handler must exist for Chrome to consider the SW "active",
  // but by not calling event.respondWith(), all requests go to the network.
});
