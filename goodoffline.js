/**
 * goodoffline.js - TRẦN CƯỜNG
 * - Tự động tạo giao diện Màn hình Chờ (Loading Screen) chuyên nghiệp.
 * - Quét tất cả thẻ <audio>, hiển thị thanh trượt tiến trình và phần trăm (%) tải nhạc.
 * - Kiểm tra, lưu trữ nhạc trực tiếp vào IndexedDB cho đến khi sẵn sàng 100% Offline.
 * - Chặn sao chép, quét khối và click chuột phải (Không chặn F12).
 * - Tự động đăng ký Service Worker bo-dem-web.js.
 */

(function () {
    // Cấu hình tên bộ nhớ lưu trữ nhạc
    const DB_NAME = 'AudioSourceNewDB';
    const STORE_NAME = 'nhac_le_files';
    const DB_VERSION = 3; // Nâng version để đồng bộ mới hoàn toàn
    let db;

    // --- LỚP 1: TỰ ĐỘNG DỰNG GIAO DIỆN MÀN HÌNH CHỜ (LOADING SCREEN) VỚI CSS ---
    function createLoadingScreen() {
        // Tạo container màn hình chờ phủ kín
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        
        // Cấu hình giao diện hộp trạng thái ở giữa màn hình
        loadingDiv.innerHTML = `
            <div class="loading-box">
                <h2>HỆ THỐNG KIỂM CHỨNG OFFLINE</h2>
                <p id="loading-status">Đang khởi tạo bộ nhớ thiết bị...</p>
                
                <div class="progress-container">
                    <div id="progress-bar"></div>
                </div>
                
                <div id="progress-percent">0%</div>
                <div class="author-tag">Thiết kế bởi: Trần Cường</div>
            </div>
        `;

        // Chèn style CSS trực tiếp vào trang để đảm bảo giao diện hiển thị đẹp, sang trọng
        const style = document.createElement('style');
        style.innerHTML = `
            #loading-screen {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(135deg, #1e1e24 0%, #111115 100%);
                display: flex; align-items: center; justify-content: center;
                z-index: 999999; font-family: sans-serif; color: #fff;
                transition: opacity 0.5s ease, visibility 0.5s;
            }
            .loading-box {
                width: 85%; max-width: 450px; background: rgba(255, 255, 255, 0.06);
                padding: 30px; border-radius: 20px; text-align: center;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
            }
            .loading-box h2 {
                font-size: 1.4rem; color: #FFD700; margin-bottom: 10px; letter-spacing: 1px;
            }
            .loading-box p {
                font-size: 0.95rem; color: #ccc; margin-bottom: 25px; min-height: 22px;
            }
            .progress-container {
                width: 100%; height: 12px; background: rgba(255,255,255,0.1);
                border-radius: 6px; overflow: hidden; margin-bottom: 12px;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
            }
            #progress-bar {
                width: 0%; height: 100%;
                background: linear-gradient(90deg, #FFD700 0%, #ffa500 100%);
                border-radius: 6px; transition: width 0.1s linear;
                box-shadow: 0 0 10px rgba(255,215,0,0.5);
            }
            #progress-percent {
                font-size: 1.6rem; font-weight: bold; color: #FFD700; margin-bottom: 10px;
            }
            .author-tag {
                font-size: 0.75rem; color: #777; margin-top: 15px; letter-spacing: 0.5px;
            }
            /* Hiệu ứng ẩn màn hình chờ mượt mà */
            .fade-out { opacity: 0; visibility: hidden; }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingDiv);
    }

    // Cập nhật giá trị hiển thị trên thanh trượt và số phần trăm (%)
    function updateProgress(percent, statusText) {
        const progressBar = document.getElementById('progress-bar');
        const progressPercent = document.getElementById('progress-percent');
        const loadingStatus = document.getElementById('loading-status');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.innerText = `${Math.round(percent)}%`;
        if (loadingStatus) loadingStatus.innerText = statusText;
    }

    // Tắt màn hình chờ để mở trang chính ứng dụng
    function hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.add('fade-out');
            // Chờ hiệu ứng mờ dần (0.5s) xong thì xóa hẳn khỏi cây thư mục DOM
            setTimeout(() => screen.remove(), 500);
        }
    }

    // --- LỚP 2: BẢO MẬT AN TOÀN (CHẶN COPY, CHUỘT PHẢI - GIỮ PHÍM F12) ---
    function initSecurity() {
        // Chặn menu chuột phải
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Chặn bôi đen quét khối chữ
        document.addEventListener('selectstart', e => e.preventDefault());

        // Chặn tổ hợp phím sao chép, lưu trang (Ctrl+C, U, S, P, A) nhưng KHÔNG chặn F12
        document.addEventListener('keydown', e => {
            if (e.keyCode === 123 || e.key === 'F12') return true; 
            if (e.ctrlKey || e.metaKey) {
                const blockedKeys = ['c', 'u', 's', 'p', 'a'];
                if (blockedKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Khóa quét khối triệt để bổ sung bằng CSS trên mọi thiết bị di động
        const s = document.createElement('style');
        s.innerHTML = `* { -webkit-user-select:none!important; user-select:none!important; -webkit-touch-callout:none!important; }`;
        document.head.appendChild(s);
        console.log('[Bảo Mật] Đã kích hoạt chặn sao chép giao diện (F12 vẫn hoạt động).');
    }

    // --- LỚP 3: ĐĂNG KÝ SERVICE WORKER BỘ ĐỆM OFFLINE ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./bo-dem-web.js')
                .then(() => console.log('[Service Worker] Đã đăng ký bộ đệm Offline.'))
                .catch(err => console.error('[Service Worker] Thất bại:', err));
        });
    }

    // --- LỚP 4: KẾT NỐI VÀ KHỞI TẠO INDEXEDDB ---
    function initDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                const d = e.target.result;
                if (d.objectStoreNames.contains(STORE_NAME)) d.deleteObjectStore(STORE_NAME);
                d.createObjectStore(STORE_NAME, { keyPath: 'url' });
            };
            req.onsuccess = e => { db = e.target.result; resolve(); };
            req.onerror = e => reject(e.target.error);
        });
    }

    // --- LỚP 5: TIẾN TRÌNH QUÉT NHẠC, CHẠY THANH TRƯỢT VÀ ĐỒNG BỘ OFFLINE ---
    async function startSystemOfflineVerification() {
        // 1. Tạo màn hình chờ Loading ngay lập tức khi chạy trang web
        createLoadingScreen();
        // 2. Kích hoạt bảo mật khóa copy
        initSecurity();

        try {
            updateProgress(5, 'Đang thiết lập cơ sở dữ liệu an toàn...');
            await initDB();
            
            const audios = document.querySelectorAll('audio');
            const audioList = [];
            audios.forEach(audio => {
                const src = audio.getAttribute('src');
                if (src) audioList.push({ element: audio, url: src });
            });

            const totalFiles = audioList.length;
            if (totalFiles === 0) {
                updateProgress(100, 'Ứng dụng đã sẵn sàng!');
                setTimeout(hideLoadingScreen, 600);
                return;
            }

            console.log(`[Hệ Thống] Phát hiện thấy tổng cộng ${totalFiles} file nhạc cần đồng bộ.`);
            let processedCount = 0;
            let missingOfflineCount = 0;

            // Vòng lặp đồng bộ và tính toán tỉ lệ phần trăm từng bài
            for (const item of audioList) {
                const src = item.url;
                const audio = item.element;

                // Đọc dữ liệu từ bộ nhớ máy
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const record = await new Promise(r => {
                    const g = store.get(src);
                    g.onsuccess = () => r(g.result);
                });

                if (record) {
                    // Bài nhạc đã có sẵn trong máy -> Gán thẳng URL nội bộ vào nguồn phát
                    audio.src = URL.createObjectURL(record.blob);
                    processedCount++;
                    
                    // Tính toán phần trăm lũy tiến dựa trên số file xử lý thành công
                    let percent = 5 + ((processedCount / totalFiles) * 90);
                    updateProgress(percent, `Kiểm chứng thành công file sẵn có: ${src}`);
                } else {
                    // Bài nhạc chưa có sẵn -> Tiến hành tải ngầm từ máy chủ internet
                    if (navigator.onLine) {
                        try {
                            updateProgress(5 + ((processedCount / totalFiles) * 90), `Đang tải mới file phục vụ Offline: ${src}`);
                            
                            const res = await fetch(src);
                            if (!res.ok) throw new Error('Network error');
                            const blob = await res.blob();
                            
                            // Lưu trữ vĩnh viễn vào bộ nhớ IndexedDB máy
                            const txW = db.transaction(STORE_NAME, 'readwrite');
                            txW.objectStore(STORE_NAME).put({ url: src, blob: blob });
                            
                            audio.src = URL.createObjectURL(blob);
                            console.log(`[Lưu Trữ] Đã tải & lưu thành công: ${src}`);
                        } catch (err) {
                            console.error(`[Lỗi] Không thể nạp file nhạc: ${src}`, err);
                        }
                    } else {
                        // Trường hợp mất mạng và file cũng không có sẵn (Người dùng mới xóa cache xong tắt mạng)
                        missingOfflineCount++;
                    }
                    
                    processedCount++;
                    let percent = 5 + ((processedCount / totalFiles) * 90);
                    updateProgress(percent, `Đang nạp dữ liệu máy chủ: ${src}`);
                }
            }

            // Hoàn tất việc đồng bộ dữ liệu
            updateProgress(100, 'Mọi việc đã sẵn sàng cho Offline hoàn hảo!');

            // Cảnh báo kiểm chứng trực quan nếu người dùng truy cập lần đầu hoặc xóa sạch bộ nhớ mà không bật mạng
            if (missingOfflineCount > 0 && !navigator.onLine) {
                alert(`⚠️ THÔNG BÁO KIỂM CHỨNG OFFLINE:\nHệ thống phát hiện thấy bộ nhớ máy của anh Cường đang thiếu hụt ${missingOfflineCount} file âm thanh (do mới thực hiện hành động xóa lịch sử duyệt web hoặc xóa cache trình duyệt trước đó).\n\nVui lòng bật kết nối mạng Internet (Wifi/4G) lên và load lại trang một lần để hệ thống tự động kéo đủ nhạc về máy nhé anh.`);
            }

            // Chờ một chút cho người dùng nhìn thấy số 100% rồi ẩn màn hình chờ để vào trang chính của ứng dụng
            setTimeout(hideLoadingScreen, 800);

        } catch (err) {
            console.error('[Hệ Thống] Gặp lỗi kiểm chứng tổng thể:', err);
            // Nếu có sự cố lỗi hệ thống bất khả kháng, vẫn cho mở ứng dụng để không làm gián đoạn công việc của anh
            updateProgress(100, 'Lỗi hệ thống đồng bộ, đang chuyển tiếp...');
            setTimeout(hideLoadingScreen, 1000);
        }
    }

    // Đăng ký kích hoạt tiến trình kiểm tra
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startSystemOfflineVerification);
    } else {
        startSystemOfflineVerification();
    }
})();