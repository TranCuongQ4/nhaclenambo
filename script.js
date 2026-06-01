/**
 * script.js - PHIÊN BẢN CHUẨN HÓA SIÊU TỐC ĐỘ & VÒNG LẶP KHÍT RỊT
 * Tối ưu hóa bởi: Trần Cường - Bấm phát hát ngay, gối đầu mượt như VLC
 */

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.music-btn');

    let currentMain = null;
    let currentMainBtn = null;

    let currentKen = null;
    let currentKenBtn = null;

    let holdTimeout = null;

    // Danh sách các ID nút KHÔNG ĐƯỢC PHÁT LẶP (chạy 1 lần rồi thôi)
    const noLoopList = ['audio-1', 'audio-4', 'audio-9', 'audio-10', 'audio-15'];

    // CHỐNG TRÙNG LỆNH TRÊN DI ĐỘNG: Cấu hình bắt sự kiện chạm chuẩn xác nhất
    buttons.forEach(button => {
        const id = button.dataset.audioId;
        let pressStart = 0;
        let isHandling = false; // Biến khóa chống trùng mousedown và touchstart sát nhau

        // Định nghĩa hàm xử lý chung khi người dùng bắt đầu chạm/nhấn nút
        const onPressStart = (e) => {
            e.preventDefault();
            pressStart = Date.now();
            holdTimeout = setTimeout(() => stopAll(), 500); // Nhấn giữ 0.5 giây tắt hết sạch nhạc
        };

        // Định nghĩa hàm xử lý khi người dùng thả nút ra
        const onPressEnd = (e) => {
            e.preventDefault();
            clearTimeout(holdTimeout);

            // Nếu thả ra trong vòng dưới 0.5 giây -> Tính là cú Click phát nhạc
            if (Date.now() - pressStart < 500) {
                if (isHandling) return; // Nếu đang xử lý rồi thì bỏ qua sự kiện trùng
                isHandling = true;
                
                handleClick(id, button);
                
                // Mở khóa sau 100ms để sẵn sàng cho cú bấm tiếp theo
                setTimeout(() => { isHandling = false; }, 100);
            }
        };

        // Gán sự kiện cho cả Máy tính và Điện thoại cảm ứng
        button.addEventListener('mousedown', onPressStart);
        button.addEventListener('mouseup', onPressEnd);
        button.addEventListener('touchstart', onPressStart, { passive: false });
        button.addEventListener('touchend', onPressEnd, { passive: false });
    });

    function getType(id) {
        if (id === 'audio-1') return 'solo';
        if (['audio-5', 'audio-6'].includes(id)) return 'ken';
        return 'main';
    }

    function handleClick(id, btn) {
        const type = getType(id);

        // 1. XỬ LÝ NHÓM SOLO (ĐÀN DỘI DỰNG GIÁ)
        if (type === 'solo') {
            stopAll();
            playMain(id, btn);
            return;
        }

        // 2. XỬ LÝ NHÓM KÈN (KÈN TRUNG)
        if (type === 'ken') {
            let a = document.getElementById(id);
            if (!a) return;

            if (currentKen === a) {
                if (!a.paused) {
                    a.pause();
                    setPaused(btn);
                } else {
                    a.play().catch(err => console.log(err));
                    setPlaying(btn);
                }
                return;
            }

            stopKen();
            currentKen = a;
            currentKenBtn = btn;
            a.currentTime = 0;
            a.play().catch(err => console.log(err));
            setPlaying(btn);
            return;
        }

        // 3. XỬ LÝ NHÓM MAIN (HÒA TẤU, KÈN NGHINH THIÊN, TRỐNG TƯ, XÀ CÀO...)
        if (currentMainBtn === btn) {
            // Nếu bấm lại đúng cái nút đang phát -> Tắt lập tức nhóm Main
            stopMain();
            stopSpecialTransitions();
            return;
        }

        // Nếu bấm nút mới -> Dập nút cũ ngay lập tức và nổ nhạc mới
        stopMain();
        stopSpecialTransitions();
        playMain(id, btn);
    }

    // KỸ THUẬT GỐI ĐẦU TOÁN HỌC: Giúp đoạn ĐẦU và GIỮA khớp nhau khít rịt không vết xước
    function setupSeamlessTransition(firstAudioId, secondAudioId, btn) {
        const firstAudio = document.getElementById(firstAudioId);
        const secondAudio = document.getElementById(secondAudioId);
        if (!firstAudio || !secondAudio) return;

        currentMain = firstAudio;
        currentMainBtn = btn;

        firstAudio.currentTime = 0;
        secondAudio.currentTime = 0;
        secondAudio.loop = true; // Đoạn giữa tự động lặp vô tận

        // Nổ nhạc đoạn đầu ngay lập tức từ bộ nhớ Blob offline của máy anh
        firstAudio.play().catch(err => console.log(err));
        setPlaying(btn);

        let transitioned = false;

        // Theo dõi thời gian thực của file: Bắn lệnh phát đoạn giữa sớm trước khi đoạn đầu hết 0.08 giây
        // Khoảng bù trừ siêu nhỏ này sẽ triệt tiêu hoàn toàn lỗi khựng âm thanh mặc định của file MP3
        firstAudio.ontimeupdate = () => {
            const timeLeft = firstAudio.duration - firstAudio.currentTime;
            if (timeLeft <= 0.08 && !transitioned) {
                transitioned = true;
                secondAudio.play().catch(err => console.log(err));
                currentMain = secondAudio; // Giao quyền điều khiển chính cho đoạn giữa
            }
        };

        firstAudio.onended = () => {
            firstAudio.ontimeupdate = null;
            if (!transitioned) {
                secondAudio.play().catch(err => console.log(err));
                currentMain = secondAudio;
            }
        };
    }

    function playMain(id, btn) {
        // 🔥 ĐẶC BIỆT: Kích hoạt chuỗi gối đầu mượt cho Trống Tư
        if (id === 'audio-3') {
            setupSeamlessTransition('audio-3', 'audio-3b', btn);
            return;
        }

        // 🔥 ĐẶC BIỆT: Kích hoạt chuỗi gối đầu mượt cho Xà Cào
        if (id === 'audio-14') {
            setupSeamlessTransition('audio-14a', 'audio-14b', btn);
            return;
        }

        // Phát nhạc cho tất cả các nút thông thường còn lại (Hòa Tấu, Kèn Nghinh Thiên...)
        let a = document.getElementById(id);
        if (!a) return;

        currentMain = a;
        currentMainBtn = btn;
        a.currentTime = 0;

        const isLoop = !noLoopList.includes(id);
        a.loop = isLoop;

        // Lệnh phát tức thì ra loa
        a.play().catch(err => console.log("Lỗi lệnh play:", err));
        setPlaying(btn);

        if (!isLoop) {
            a.onended = () => {
                resetButton(btn);
                if (currentMain === a) {
                    currentMain = null;
                    currentMainBtn = null;
                }
            };
        }
    }

    function stopMain() {
        if (currentMain) {
            currentMain.pause();
            currentMain.currentTime = 0;
            currentMain.ontimeupdate = null;
        }
        if (currentMainBtn) resetButton(currentMainBtn);

        currentMain = null;
        currentMainBtn = null;
    }

    function stopKen() {
        if (currentKen) {
            currentKen.pause();
            currentKen.currentTime = 0;
        }
        if (currentKenBtn) resetButton(currentKenBtn);

        currentKen = null;
        currentKenBtn = null;
    }

    function stopSpecialTransitions() {
        ['audio-3', 'audio-3b', 'audio-14a', 'audio-14b'].forEach(id => {
            let a = document.getElementById(id);
            if (a) {
                a.pause();
                a.currentTime = 0;
                a.ontimeupdate = null;
            }
        });
    }

    function stopAll() {
        document.querySelectorAll('audio').forEach(a => {
            a.pause();
            a.currentTime = 0;
            a.ontimeupdate = null;
        });

        document.querySelectorAll('.music-btn').forEach(resetButton);

        currentMain = null;
        currentKen = null;
        currentMainBtn = null;
        currentKenBtn = null;
    }

    function setPlaying(btn) {
        btn.style.color = "#FFD700";
        btn.style.animation = "blink 1s infinite";
    }

    function setPaused(btn) {
        btn.style.color = "#00AEEF";
        btn.style.animation = "none";
    }

    function resetButton(btn) {
        btn.style.color = "#000";
        btn.style.animation = "none";
    }
});