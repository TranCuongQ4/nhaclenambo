/**
 * kiemchung.js - Giải pháp Offline & Bảo mật cho Nhạc Lễ Nam Bộ - Trần Cường
 */

(function() {
    // ==========================================
    // 1. CHẶN CHUỘT PHẢI & QUÉT KHỐI (GIỮ F12)
    // ==========================================
    const lockInterface = () => {
        // Chặn menu chuột phải
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Chặn bôi đen/quét khối
        document.addEventListener('selectstart', e => e.preventDefault());

        // Chặn phím tắt (Ctrl+C, S, U) nhưng cho phép F12 (123)
        document.addEventListener('keydown', e => {
            if (e.keyCode === 123) return true; // Cho phép F12
            if (e.ctrlKey || e.metaKey) {
                const k = e.key.toLowerCase();
                if (['c', 'u', 's', 'a', 'p'].includes(k)) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Áp dụng CSS chặn quét khối toàn diện trên điện thoại
        const s = document.createElement('style');
        s.innerHTML = `* { -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }`;
        document.head.appendChild(s);
        console.log('[Bảo Mật] Đã chặn sao chép (F12 vẫn hoạt động).');
    };

    // ==========================================
    // 2. ĐĂNG KÝ SERVICE WORKER
    // ==========================================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./bo-dem-web.js')
            .then(() => console.log('[Hệ Thống] Đã đăng ký bộ đệm Offline.'));
    }

    // ==========================================
    // 3. INDEXEDDB - LƯU MP3 VÀO MÁY
    // ==========================================
    const DB_INFO = { name: 'TranCuong_SourceMoi', version: 1, store: 'mp3_data' };
    let db;

    const openDB = () => {
        return new Promise((res, rej) => {
            const req = indexedDB.open(DB_INFO.name, DB_INFO.version);
            req.onupgradeneeded = e => e.target.result.createObjectStore(DB_INFO.store, { keyPath: 'name' });
            req.onsuccess = e => { db = e.target.result; res(db); };
            req.onerror = () => rej();
        });
    };

    const getFile = (name) => {
        return new Promise(res => {
            const trans = db.transaction(DB_INFO.store, 'readonly');
            const req = trans.objectStore(DB_INFO.store).get(name);
            req.onsuccess = () => res(req.result ? req.result.blob : null);
        });
    };

    const saveFile = (name, blob) => {
        const trans = db.transaction(DB_INFO.store, 'readwrite');
        trans.objectStore(DB_INFO.store).put({ name, blob });
    };

    // ==========================================
    // 4. LOGIC XỬ LÝ TỰ ĐỘNG TẢI & KIỂM CHỨNG
    // ==========================================
    const startSync = async () => {
        await openDB();
        const audios = document.querySelectorAll('audio'); // Quét tất cả thẻ audio trong source mới[cite: 5]
        let missing = 0;

        for (let a of audios) {
            const src = a.getAttribute('src');
            if (!src) continue;

            const cachedBlob = await getFile(src);

            if (cachedBlob) {
                // Đã có file trong máy -> Chuyển sang dùng Offline ngay
                a.src = URL.createObjectURL(cachedBlob);
                // Nếu đang có mạng, cập nhật ngầm để file luôn mới
                if (navigator.onLine) {
                    fetch(src).then(r => r.blob()).then(b => saveFile(src, b)).catch(() => {});
                }
            } else {
                // Chưa có file -> Tải về nếu có mạng
                if (navigator.onLine) {
                    try {
                        const b = await fetch(src).then(r => r.blob());
                        saveFile(src, b);
                        a.src = URL.createObjectURL(b);
                        console.log(`[Lưu Trữ] Đã tải & lưu thành công: ${src}`);
                    } catch (err) {
                        console.error(`Lỗi tải: ${src}`);
                    }
                } else {
                    missing++;
                }
            }
        }

        // Cảnh báo nếu xóa cache mà mở web lúc không có mạng
        if (missing > 0 && !navigator.onLine) {
            alert(`⚠️ CẢNH BÁO KIỂM CHỨNG:\nPhát hiện ${missing} file nhạc chưa được nạp vào bộ nhớ máy (có thể do bạn đã xóa cache).\nVui lòng bật Wifi/Mạng và tải lại trang một lần để sử dụng Offline.`);
        }
    };

    // Chạy các tính năng
    lockInterface();
    if (document.readyState === 'complete') {
        startSync();
    } else {
        window.addEventListener('load', startSync);
    }
})();