/**
 * script.js - Phiên bản nâng cấp Web Audio API (Howler.js)
 * Phát triển bởi: Trần Cường - Tối ưu vòng lặp tuyệt đối không khựng nhịp
 */

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.music-btn');

    // Quản lý các đối tượng phát nhạc Howler
    let currentMainSound = null;
    let currentMainId = null; // Lưu ID nút đang chạy dạng main
    let currentMainBtn = null;

    let currentKenSound = null;
    let currentKenId = null;  // Lưu ID nút đang chạy dạng kèn
    let currentKenBtn = null;

    let holdTimeout = null;

    // Danh sách các ID nút KHÔNG ĐƯỢC PHÁT LẶP (Chạy một lần rồi dừng)
    const noLoopList = ['audio-1', 'audio-4', 'audio-9', 'audio-10', 'audio-15'];

    // Bản đồ cấu hình ánh xạ từ data-audio-id sang file mp3 vật lý
    const audioMap = {
        'audio-1': 'trongdandunggia.mp3',
        'audio-2': 'raobongtu.mp3',
        'audio-3': 'daubongtu.mp3',      // Đoạn đầu Trống Tư
        'audio-3b': 'giuabongtu.mp3',    // Đoạn giữa Trống Tư (Loop cực mượt)
        'audio-4': 'dutbongtu.mp3',
        'audio-5': 'kentrungmoc.mp3',
        'audio-6': 'kentrunghoixuan.mp3',
        'audio-7': 'chauchieng.mp3',
        'audio-8': 'giuatrongchien.mp3',
        'audio-9': 'duttrongchien.mp3',
        'audio-10': 'diembo.mp3',
        'audio-11': 'nhactran.mp3',
        'audio-12': 'nhactrubo.mp3',
        'audio-13': 'neuxacao.mp3',
        'audio-14a': 'xacaodau.mp3',     // Đoạn đầu Xà Cào
        'audio-14b': 'xacaogiua.mp3',    // Đoạn giữa Xà Cào (Loop cực mượt)
        'audio-15': 'xacaodut.mp3',
        'audio-16': 'niemadidaphat.mp3',
        'audio-17': 'motcoidive.mp3',
        'audio-18': 'longmedanbau.mp3',
        'audio-19': 'tinhchasao.mp3',
        'audio-20': 'hoatauconhac.mp3',
        'audio-21': 'kennghinhthien.mp3'
    };

    // Đăng ký sự kiện tương tác trên hệ thống nút bấm
    buttons.forEach(button => {
        const id = button.dataset.audioId;

        button.addEventListener('mousedown', startPress);
        button.addEventListener('mouseup', endPress);
        button.addEventListener('touchstart', startPress);
        button.addEventListener('touchend', endPress);

        let pressStart = 0;

        function startPress(e) {
            e.preventDefault();
            pressStart = Date.now();
            // Nhấn giữ lâu hơn 500ms sẽ kích hoạt lệnh tắt toàn bộ âm thanh
            holdTimeout = setTimeout(() => stopAll(), 500);
        }

        function endPress(e) {
            e.preventDefault();
            clearTimeout(holdTimeout);

            if (Date.now() - pressStart < 500) {
                handleClick(id, button);
            }
        }
    });

    // Phân loại nhóm nhạc để chạy độc lập hoặc chạy đè nền
    function getType(id) {
        if (id === 'audio-1') return 'solo';
        if (['audio-5', 'audio-6'].includes(id)) return 'ken';
        return 'main';
    }

    function handleClick(id, btn) {
        const type = getType(id);

        if (type === 'solo') {
            stopAll();
            playMain(id, btn);
            return;
        }

        if (type === 'ken') {
            if (currentKenId === id && currentKenSound) {
                if (currentKenSound.playing()) {
                    currentKenSound.pause();
                    setPaused(btn);
                } else {
                    currentKenSound.play();
                    setPlaying(btn);
                }
                return;
            }
            stopKen();
            playKen(id, btn);
            return;
        }

        // Đối với nhóm Main thông thường
        if (currentMainId === id && currentMainSound) {
            if (currentMainSound.playing()) {
                currentMainSound.pause();
                setPaused(btn);
            } else {
                currentMainSound.play();
                setPlaying(btn);
            }
            return;
        }

        stopMain();
        playMain(id, btn);
    }

    // Hàm khởi tạo một đối tượng Howl mới chuẩn cấu hình
    function createHowl(srcFile, shouldLoop) {
        return new Howl({
            src: [srcFile],
            html5: false, // Bắt buộc bằng false để ép nạp vào Web Audio API chạy mượt không trễ
            preload: true,
            loop: shouldLoop
        });
    }

    // Xử lý phát nhóm nhạc cốt lõi (Main)
    function playMain(id, btn) {
        currentMainId = id;
        currentMainBtn = btn;

        // 🔥 THIẾT KẾ ĐẶC BIỆT: TRỐNG TƯ (Nối đầu -> giữa loop)
        if (id === 'audio-3') {
            let firstSound = createHowl(audioMap['audio-3'], false);
            currentMainSound = firstSound;
            setPlaying(btn);

            firstSound.play();

            firstSound.on('end', () => {
                if (currentMainId !== 'audio-3') return; // Phòng trường hợp anh đã bấm nút khác
                
                // Kích hoạt ngay lập tức đoạn giuabongtu.mp3 với chế độ loop chuẩn tuyệt đối
                let secondSound = createHowl(audioMap['audio-3b'], true);
                currentMainSound = secondSound;
                secondSound.play();
            });
            return;
        }

        // 🔥 THIẾT KẾ ĐẶC BIỆT: XÀ CÀO (Nối đầu -> giữa loop)
        if (id === 'audio-14') {
            let firstSound = createHowl(audioMap['audio-14a'], false);
            currentMainSound = firstSound;
            setPlaying(btn);

            firstSound.play();

            firstSound.on('end', () => {
                if (currentMainId !== 'audio-14') return;
                
                // Kích hoạt ngay lập tức đoạn xacaogiua.mp3 vòng lặp gối đầu khít rịt
                let secondSound = createHowl(audioMap['audio-14b'], true);
                currentMainSound = secondSound;
                secondSound.play();
            });
            return;
        }

        // Cho các nút nhạc thông thường trong nhóm Main
        const isLoop = !noLoopList.includes(id);
        let soundFile = audioMap[id];
        
        if (!soundFile) return;

        let sound = createHowl(soundFile, isLoop);
        currentMainSound = sound;
        setPlaying(btn);

        sound.play();

        if (!isLoop) {
            sound.on('end', () => {
                resetButton(btn);
                if (currentMainId === id) {
                    currentMainSound = null;
                    currentMainId = null;
                    currentMainBtn = null;
                }
            });
        }
    }

    // Xử lý phát nhóm nhạc Kèn (Có thể thổi đè lên điệu Trống)
    function playKen(id, btn) {
        currentKenId = id;
        currentKenBtn = btn;
        
        let soundFile = audioMap[id];
        if (!soundFile) return;

        let sound = createHowl(soundFile, true);
        currentKenSound = sound;
        setPlaying(btn);

        sound.play();
    }

    function stopMain() {
        if (currentMainSound) {
            currentMainSound.stop();
            currentMainSound.unload(); // Giải phóng bộ nhớ đệm
        }
        if (currentMainBtn) resetButton(currentMainBtn);

        currentMainSound = null;
        currentMainId = null;
        currentMainBtn = null;
    }

    function stopKen() {
        if (currentKenSound) {
            currentKenSound.stop();
            currentKenSound.unload();
        }
        if (currentKenBtn) resetButton(currentKenBtn);

        currentKenSound = null;
        currentKenId = null;
        currentKenBtn = null;
    }

    // Tắt toàn bộ hệ thống âm thanh lập tức khi nhấn giữ nút bất kỳ
    function stopAll() {
        Howler.stop(); // Lệnh toàn cục dập tắt tất cả mọi nguồn phát tức thì
        document.querySelectorAll('.music-btn').forEach(resetButton);

        currentMainSound = null;
        currentMainId = null;
        currentMainBtn = null;

        currentKenSound = null;
        currentKenId = null;
        currentKenBtn = null;
    }

    // Thay đổi trạng thái hiển thị của nút bấm
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