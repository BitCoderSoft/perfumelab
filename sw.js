const CACHE_NAME = "perfume-recipe-cad-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Instalação
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Cache aberto");
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação (limpa cache antigo)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Intercepta requisições
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
