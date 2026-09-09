const CACHE='furever-static-v1';
const STATIC=['/icon.svg','/icon-192.png','/icon-512.png','/assets/sanctuary.webp','/assets/companion.webp','/assets/world-map.webp','/offline.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET'||url.pathname.startsWith('/api/'))return;if(STATIC.includes(url.pathname))event.respondWith(caches.match(event.request).then(found=>found||fetch(event.request)));else if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))});

