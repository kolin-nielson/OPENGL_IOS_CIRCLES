self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("circles-cache").then((cache) => {
            return cache.addAll(["./", "index.html", "app.js", "Circle.js", "collisions.js", "manifest.json"]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
