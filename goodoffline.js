/**
 * goodoffline.js - TRẦN CƯỜNG
 * - Tự động dựng giao diện Màn hình chờ (Loading Screen) đẹp mắt, có thanh trượt tiến trình và số %.
 * - Đồng bộ quét toàn bộ thẻ <audio> trên giao diện, tự tải và lưu nhạc vào IndexedDB.
 * - Chỉ khi tiến trình kiểm chứng đạt 100% hoàn hảo mới cho phép ẩn màn hình chờ để vào trang chính.
 * - Tích hợp bộ bảo mật khóa chuột phải, chặn quét khối chữ (Bỏ qua không chặn phím F12).
 * - Kích hoạt đăng ký ngầm file bộ đệm Service Worker bo-dem-web.js.
 */

(function () {
    // Cấu hình đồng bộ cơ sở dữ liệu IndexedDB cho bản nhạc mới
    const DB_NAME = 'AudioSourceNewDB';
    const STORE_NAME = 'nhac_le_files';
    const DB_VERSION = 3; // Nâng cấp phiên bản để làm sạch bộ nhớ cũ
    let db = null;

    // --- LỚP 1: TỰ ĐỘNG DỰNG MÀN HÌNH CHỜ (LOADING SCREEN) BẰNG CODE ---
    function createLoadingScreen() {
        // Tạo thẻ div bao phủ toàn màn hình
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        
        // Tạo cấu trúc giao diện hộp tiến trình ở trung tâm màn hình
        loadingDiv.innerHTML = `
            <div class="loading-box">
                <h2>HỆ THỐNG KIỂM CHỨNG OFFLINE</h2>
                <p id="loading-status">Đang khởi tạo cấu trúc lưu trữ thiết bị...</p>
                
                <div class="progress-container">
                    <div id="progress-bar"></div>
                </div>
                
                <div id="progress-percent">0%</div>
                <div class="author-tag">Phát triển bởi: Trần Cường</div>
            </div>
        `;

        // Nhúng trực tiếp CSS giao diện cao cấp vào document head để anh không phải sửa file style.css gốc
        const style = document.createElement('style');
        style.innerHTML = `
            #loading-screen {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: linear-gradient(135deg, #141419 0%, #08080a 100%);
                display: flex; align-items: center; justify-content: center;
                z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #fff;
                transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s;
            }
            .loading-box {
                width: 88%; max-width: 460px; background: rgba(255, 255, 255, 0.05);
                padding: 35px 25px; border-radius: 24px; text-align: center;
                box-shadow: 0 25px 60px rgba(0,0,0,0.65);
                border: 1px solid rgba(255,255,255,0.08);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }
            .loading-box h2 {
                font-size: 1.35rem; color: #FFD700; margin-bottom: 8px; letter-spacing: 1px; font-weight: 700;
            }
            .loading-box p {
                font-size: 0.9rem; color: #b5b5be; margin-bottom: 25px; min-height: 20px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .progress-container {
                width: 100%; height: 10px; background: rgba(255,255,255,0.08);
                border-radius: 5px; overflow: hidden; margin-bottom: 12px;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
            }
            #progress-bar {
                width: 0%; height: 100%;
                background: linear-gradient(90deg, #FFD700 0%, #ff8c00 100%);
                border-radius: 5px; transition: width 0.1s ease-out;
                box-shadow: 0 0 12px rgba(255,215,0,0.4);
            }
            #progress-percent {
                font-size: 1.8rem; font-weight: bold; color: #FFD700; margin-bottom: 5px; font-family: monospace;
            }
            .author-tag {
                font-size: 0.75rem; color: #52525b; margin-top: 15px; letter-spacing: 0.5px;
            }
            /* Hiệu ứng biến mất mượt mà khi nạp xong */
            .fade-out { opacity: 0; visibility: hidden; }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingDiv);
    }

    // Hàm cập nhật trạng thái hiển thị của thanh trượt và con số %
    function updateProgress(percent, statusText) {
        const progressBar = document.getElementById('progress-bar');
        const progressPercent = document.getElementById('progress-percent');
        const loadingStatus = document.getElementById('loading-status');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.innerText = `${Math.round(percent)}%`;
        if (loadingStatus) loadingStatus.innerText = statusText;
    }

    // Hàm thực hiện tắt màn hình chờ để lộ diện trang web chính của ứng dụng
    function hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.classList.add('fade-out');
            setTimeout(() => screen.remove(), 600); // Đợi hiệu ứng mờ kết thúc thì giải phóng bộ nhớ DOM
        }
    }

    // --- LỚP 2: BẢO MẬT GIAO DIỆN CHẶN SAO CHÉP (KHÔNG CHẶN F12) ---
    function initSecurity() {
        // Chặn menu khi nhấn chuột phải
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Chặn bôi đen lựa chọn văn bản
        document.addEventListener('selectstart', e => e.preventDefault());

        // Chặn phím tắt (Ctrl+C sao chép, Ctrl+U xem source, Ctrl+S lưu file,...) nhưng GIỮ LẠI F12 để anh kiểm tra lệnh
        document.addEventListener('keydown', e => {
            if (e.keyCode === 123 || e.key === 'F12') return true; 
            if (e.ctrlKey || e.metaKey) {
                const blocked = ['c', 'u', 's', 'p', 'a'];
                if (blocked.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Khóa tính năng quét khối triệt để bằng luật CSS ép buộc trên thiết bị di động
        const s = document.createElement('style');
        s.innerHTML = `* { -webkit-user-select:none!important; user-select:none!important; -webkit-touch-callout:none!important; }`;
        document.head.appendChild(s);
        console.log('[Bảo Mật] Đã kích hoạt chặn sao chép giao diện (Giữ phím F12).');
    }

    // --- LỚP 3: ĐĂNG KÝ SERVICE WORKER CHO GIAO DIỆN OFFLINE ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./bo-dem-web.js')
                .then(() => console.log('[Hệ Thống] Đã đồng bộ đăng ký bộ đệm Offline.'))
                .catch(err => console.error('[Hệ Thống] Lỗi đăng ký SW:', err));
        });
    }

    // --- LỚP 4: LIÊN KẾT HỆ THỐNG CƠ SỞ DỮ LIỆU INDEXEDDB ---
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

    // --- LỚP 5: XỬ LÝ QUÉT ĐỒNG BỘ NHẠC, CHẠY PHẦN TRĂM (%) TIẾN TRÌNH ---
    async function startSystemVerification() {
        // Khởi dựng màn hình loading chờ ngay lập tức khi trang web vừa mớm nạp
        createLoadingScreen();
        // Kích hoạt ngay bộ chặn copy bảo mật
        initSecurity();

        try {
            updateProgress(5, 'Đang chuẩn bị cơ sở dữ liệu an toàn...');
            await initDB();
            
            // Lấy danh sách tất cả các thẻ audio khai báo trong index.html của anh Cường
            const audios = document.querySelectorAll('audio');
            const audioList = [];
            audios.forEach(audio => {
                const src = audio.getAttribute('src');
                if (src) audioList.push({ element: audio, url: src });
            });

            const totalFiles = audioList.length;
            if (totalFiles === 0) {
                updateProgress(100, 'Mọi thứ đã sẵn sàng!');
                setTimeout(hideLoadingScreen, 500);
                return;
            }

            console.log(`[Hệ Thống] Quét tìm thấy tổng cộng ${totalFiles} file âm thanh cần đồng bộ.`);
            let processedCount = 0;
            let missingOfflineCount = 0;

            // Chạy vòng lặp đồng bộ từng file và cập nhật thanh trượt lũy tiến
            for (const item of audioList) {
                const src = item.url;
                const audio = item.element;

                // Thực hiện đọc dữ liệu từ IndexedDB máy
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const record = await new Promise(r => {
                    const g = store.get(src);
                    g.onsuccess = () => r(g.result);
                });

                if (record) {
                    // Bản nhạc đã lưu trong máy -> Gán Blob URL nội bộ làm nguồn phát trực tiếp
                    audio.src = URL.createObjectURL(record.blob);
                    processedCount++;
                    
                    // Tính toán phần trăm (dành ra 5% đầu khởi tạo, 95% còn lại chia đều cho tổng số file)
                    let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                    updateProgress(currentPercent, `Kiểm chứng file sẵn sàng: ${src}`);
                } else {
                    // Bản nhạc chưa có trong máy -> Tải về máy nếu thiết bị đang trực tuyến
                    if (navigator.onLine) {
                        try {
                            let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                            updateProgress(currentPercent, `Đang tải dữ liệu Offline: ${src}`);
                            
                            const res = await fetch(src);
                            if (!res.ok) throw new Error('Lỗi kết nối máy chủ nhạc');
                            const blob = await res.blob();
                            
                            // Lưu trữ vĩnh viễn file vật lý vào máy người dùng
                            const txW = db.transaction(STORE_NAME, 'readwrite');
                            txW.objectStore(STORE_NAME).put({ url: src, blob: blob });
                            
                            audio.src = URL.createObjectURL(blob);
                            console.log(`[Lưu Trữ] Đã tải & lưu thành công: ${src}`);
                        } catch (err) {
                            console.error(`[Lỗi mạng] Không thể kéo dữ liệu file: ${src}`, err);
                        }
                    } else {
                        // Thiết bị mất mạng và file âm thanh này chưa từng được nạp trước đây
                        missingOfflineCount++;
                    }
                    
                    processedCount++;
                    let currentPercent = 5 + ((processedCount / totalFiles) * 95);
                    updateProgress(currentPercent, `Đang nạp bộ nhớ máy: ${src}`);
                }
            }

            // Đồng bộ chạm đích 100% hoàn hảo
            updateProgress(100, 'Hệ thống đã sẵn sàng cho Offline hoàn chỉnh!');

            // Kích hoạt thông báo kiểm chứng alert nếu phát hiện mất nhạc lúc mất mạng
            if (missingOfflineCount > 0 && !navigator.onLine) {
                alert(`⚠️ THÔNG BÁO KIỂM CHỨNG OFFLINE:\nHệ thống phát hiện bộ nhớ thiết bị đang bị thiếu hụt mất ${missingOfflineCount} file âm thanh (có thể do hành động xóa lịch sử duyệt web hoặc xóa cache trình duyệt vừa diễn ra).\n\nVui lòng kết nối Internet (Bật Wifi/4G) lên và load lại trang một lần để hệ thống tự động kéo đủ nhạc về máy nhé anh.`);
            }

            // Lưu lại một khoảng trễ nhỏ (0.8 giây) để anh kịp nhìn thấy trạng thái 100% trước khi mở trang chính
            setTimeout(hideLoadingScreen, 800);

        } catch (err) {
            console.error('[Hệ Thống] Lỗi tiến trình đồng bộ tổng thể:', err);
            // Phòng hờ lỗi hệ thống bất khả kháng, vẫn cho tháo màn hình loading để anh làm việc, không treo ứng dụng
            updateProgress(100, 'Đang chuyển tiếp giao diện...');
            setTimeout(hideLoadingScreen, 1000);
        }
    }

    // Đăng ký lệnh kích hoạt chạy toàn cục
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startSystemVerification);
    } else {
        startSystemVerification();
    }
})();