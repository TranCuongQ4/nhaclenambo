/**
 * bo-dem-web.js - Quản lý bộ đệm khung ứng dụng (App Shell)
 * Đảm bảo nạp trang web Nhạc Lễ Nam Bộ khi không có mạng internet.
 */
const CACHE_NAME = 'nhac-le-nam-bo-v9';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './goodoffline.js',
    './button.png',
    './nenchao.png'
];

// Cài đặt cấu hình lưu trữ giao diện
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Đang nạp khung ứng dụng vào bộ đệm...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Dọn dẹp cache cũ khi kích hoạt phiên bản mới
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Đang dọn dẹp cache cũ:', key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// Điều phối yêu cầu mạng khi người dùng F5 hoặc load trang offline
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    // Bỏ qua không xử lý file nhạc .mp3 vì IndexedDB đã lo liệu tối ưu hơn
    if (url.pathname.endsWith('.mp3')) return; 

    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request);
        })
    );
});