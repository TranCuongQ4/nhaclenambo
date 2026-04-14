const CACHE_NAME = 'nhac-le-nam-bo-v5';

const urlsToCache = [
  '/nhaclenambo/index.html',
  '/nhaclenambo/style.css',
  '/nhaclenambo/script.js',
  '/nhaclenambo/manifest.json',
  '/nhaclenambo/nenchao.png',
  '/nhaclenambo/button.png',
  '/nhaclenambo/icon-192.png',
  '/nhaclenambo/icon-512.png',

  '/nhaclenambo/trongdandunggia.mp3',
  '/nhaclenambo/raobongtu.mp3',
  '/nhaclenambo/daubongtu.mp3',
  '/nhaclenambo/giuabongtu.mp3',
  '/nhaclenambo/dutbongtu.mp3',
  '/nhaclenambo/kentrungmoc.mp3',
  '/nhaclenambo/kentrunghoixuan.mp3',
  '/nhaclenambo/chauchieng.mp3',
  '/nhaclenambo/giuatrongchien.mp3',
  '/nhaclenambo/duttrongchien.mp3',
  '/nhaclenambo/diembo.mp3',
  '/nhaclenambo/nhactran.mp3',
  '/nhaclenambo/nhactrubo.mp3',
  '/nhaclenambo/neuxacao.mp3',
  '/nhaclenambo/xacaodau.mp3',
  '/nhaclenambo/xacaogiua.mp3',
  '/nhaclenambo/xacaodut.mp3',
  '/nhaclenambo/niemadidaphat.mp3',
  '/nhaclenambo/motcoidive.mp3',
  '/nhaclenambo/longmedanbau.mp3',
  '/nhaclenambo/tinhchasao.mp3',
  '/nhaclenambo/hoatauconhac.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const total = urlsToCache.length;
      let loaded = 0;

      for (const url of urlsToCache) {
        try {
          await cache.add(url);
          loaded++;
          const percent = Math.round((loaded / total) * 100);

          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'CACHE_PROGRESS', percent: percent });
            });
          });
        } catch (err) {
          console.log('Cache lỗi file:', url);
        }
      }

      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_PROGRESS', percent: 100 }));
      });

      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
