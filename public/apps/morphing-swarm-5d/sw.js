const CACHE='morphing-world-yi-jing-5d-v2-static';
const URLS=['./','./index.html','./style.css','./app.js','./core/yijing-data.js','./core/yi-jing-5d.js','./core/swarm-reality-engine.js','./core/morph-engine.js','./core/sprite-runtime.classic.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
