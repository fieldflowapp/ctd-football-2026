const CACHE='absch-admin-v6';
const CORE=["./","./index.html","./manifest.webmanifest","./admin-fieldflow-icon-192.png","./admin-fieldflow-icon-512.png"];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(event.request);
      const cache=await caches.open(CACHE);
      cache.put(event.request,fresh.clone()).catch(()=>{});
      return fresh;
    }catch(err){
      const cached=await caches.match(event.request,{ignoreSearch:true});
      if(cached) return cached;
      if(event.request.mode==='navigate'){
        const fallback=await caches.match('./index.html');
        if(fallback) return fallback;
      }
      throw err;
    }
  })());
});
