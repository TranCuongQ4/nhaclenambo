const CACHE_NAME = 'nhac-le-nam-bo-v3';   // Tăng version khi bạn cập nhật nhạc sau này

const urlsToCache = [
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/nenchao.png',
  '/button.png',

  // TẤT CẢ FILE NHẠC
  '/trongdandunggia.mp3',
  '/raobongtu.mp3',
  '/daubongtu.mp3',
  '/giuabongtu.mp3',
  '/dutbongtu.mp3',
  '/kentrungmoc.mp3',
  '/kentrunghoixuan.mp3',
  '/chauchieng.mp3',
  '/giuatrongchien.mp3',
  '/duttrongchien.mp3',
  '/diembo.mp3',
  '/nhactran.mp3',
  '/nhactrubo.mp3',
  '/neuxacao.mp3',
  '/xacaodau.mp3',
  '/xacaogiua.mp3',
  '/xacaodut.mp3',
  '/niemadidaphat.mp3',
  '/motcoidive.mp3',
  '/longmedanbau.mp3',
  '/tinhchasao.mp3',
  '/hoatauconhac.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Đang tải cache cho chế độ Offline...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});