// Service worker mínimo: cachea el "shell" de la app (HTML/CSS/JS) para que
// abra rápido y funcione sin conexión. Todos los datos viven en IndexedDB en
// el propio dispositivo, así que no hay llamadas de red que excluir.

const CACHE_NAME = "guarda-gastos-v9";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/categories.js",
  "./js/db.js",
  "./js/charts.js",
  "./js/dashboard.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
