const CACHE='fieldflow-athletics-stable-shell-v1';
const STATIC_SHELL=[
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.jpg',
  './icons/maskable-icon-512.jpg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('fieldflow-athletics-')&&k!==CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;

  if(event.request.mode==='navigate' || /\/version\.json$/.test(u.pathname) || /\/manifest\.webmanifest$/.test(u.pathname)){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request,{cache:'no-cache'}).then(r=>{
      if(r&&r.ok){
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
      }
      return r;
    }).catch(()=>caches.match(event.request))
  );
});