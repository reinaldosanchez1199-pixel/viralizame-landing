const CACHE='viralizame-v1';
const FILES=['/','/index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(e.request.url.includes('api.anthropic')||e.request.url.includes('wa.me')||e.request.url.includes('stripe'))return;e.respondWith(fetch(e.request).then(r=>{if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return r;}).catch(()=>caches.match(e.request)));});
