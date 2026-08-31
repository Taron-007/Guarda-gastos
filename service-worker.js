// Service worker mínimo: solo cachea el "shell" de la app para que abra rápido
// y se pueda instalar en la pantalla de inicio del iPhone. No cachea llamadas
// a Microsoft Graph (esas siempre deben ir a la red).

const CACHE_NAME = "guarda-gastos-v8";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/vendor/msal-browser.min.js",
  "./js/app.js",
  "./js/auth.js",
  "./js/graph.js",
  "./js/msal-config.js",
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
  const url = new URL(event.request.url);

  // Nunca interceptar llamadas a Microsoft (login ni Graph API).
  if (url.hostname.endsWith("microsoftonline.com") || url.hostname.endsWith("graph.microsoft.com") || url.hostname.endsWith("msauth.net")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
