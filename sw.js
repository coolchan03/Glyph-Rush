const CACHE="glyph-rush-v1";
const CORE=["./","./index.html","./styles.css","./app.js","./db.js","./parsers.js","./manifest.webmanifest","./assets/logo.svg","./assets/icon-maskable.svg","./assets/favicon.svg","./assets/fonts/Fast_Sans.ttf","./vendor/jszip.mjs","./vendor/pdf.mjs","./vendor/pdf.worker.mjs"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match("./index.html"))));
});