/**
 * script.js - Phiên bản tối ưu gối đầu tuyệt đối không khựng nhịp (Precise Scheduling)
 * Phát triển bởi: Trần Cường - Tối ưu vòng lặp chuyển đoạn Trống Tư và Xà Cào
 */

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.music-btn');

    // Quản lý các đối tượng phát nhạc Howler
    let currentMainSound = null;
    let currentMainId = null; 
    let currentMainBtn = null;

    let currentKenSound = null;
    let currentKenId = null;  
    let currentKenBtn = null;

    // Quản lý riêng đối tượng phát nối đoạn dự phòng để dập tắt chính xác
    let nextQueuedSound = null; 

    let holdTimeout = null;

    // Danh sách các ID nút KHÔNG ĐƯỢC PHÁT LẶP
    const noLoopList = ['audio-1', 'audio-4', 'audio-9', 'audio-10', 'audio-15'];

    // Bản đồ cấu hình ánh xạ từ data-audio-id sang file mp3 vật lý
    const audioMap = {
        'audio-1': 'trongdandunggia.mp3',
        'audio-2': 'raobongtu.mp3',
        'audio-3': 'daubongtu.mp3',      // Đoạn đầu Trống Tư
        'audio-3b': 'giuabongtu.mp3',    // Đoạn giữa Trống Tư
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
        'audio-14b': 'xacaogiua.mp3',    // Đoạn giữa Xà Cào
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

        if (currentMainId === id && currentMainSound) {
            if (currentMainSound.playing() || (nextQueuedSound && nextQueuedSound.playing())) {
                if (currentMainSound.playing()) currentMainSound.pause();
                if (nextQueuedSound && nextQueuedSound.playing()) nextQueuedSound.pause();
                setPaused(btn);
            } else {
                if (currentMainSound && currentMainSound.duration() && currentMainSound.seek() < currentMainSound.duration()) {
                    currentMainSound.play();
                } else if (nextQueuedSound) {
                    nextQueuedSound.play();
                }
                setPlaying(btn);
            }
            return;
        }

        stopMain();
        playMain(id, btn);
    }

    function createHowl(srcFile, shouldLoop) {
        return new Howl({
            src: [srcFile],
            html5: false, // Ép nạp thẳng Web Audio API để quản lý đồng hồ mili-giây
            preload: true,
            loop: shouldLoop
        });
    }

    // Hàm xử lý kích hoạt chuỗi gối đầu chính xác cao
    function setupSeamlessTransition(firstFile, secondFile, button, targetId) {
        let firstSound = createHowl(firstFile, false);
        let secondSound = createHowl(secondFile, true);
        
        currentMainSound = firstSound;
        nextQueuedSound = secondSound;
        setPlaying(button);

        // Kích hoạt phát file đầu tiên
        firstSound.play();

        // Lắng nghe khi file đã tải xong cấu trúc, lập lịch tính toán thời gian gối đầu
        firstSound.on('load', () => {
            const durationMs = firstSound.duration() * 1000;
            
            // Lên lịch gối đầu trước khi file 1 kết thúc 20 mili-giây (Triệt tiêu hoàn toàn khoảng hụt của MP3)
            const triggerTime = durationMs - 20; 

            setTimeout(() => {
                // Kiểm tra nếu người dùng chưa bấm nút khác và đúng ID mục tiêu
                if (currentMainId === targetId && firstSound.playing()) {
                    currentMainSound = secondSound; // Chuyển giao quyền kiểm soát chính sang file giữa
                    secondSound.play();
                }
            }, triggerTime);
        });

        // Phòng hờ nếu setTimeout lệch nhịp, on('end') vẫn làm nhiệm vụ bọc lót cuối cùng
        firstSound.on('end', () => {
            if (currentMainId === targetId && !secondSound.playing()) {
                currentMainSound = secondSound;
                secondSound.play();
            }
        });
    }

    function playMain(id, btn) {
        currentMainId = id;
        currentMainBtn = btn;

        // 🔥 XỬ LÝ KHÔNG KHỰNG: TRỐNG TƯ (Nối đầu -> giữa tính toán trước thời gian)
        if (id === 'audio-3') {
            setupSeamlessTransition(audioMap['audio-3'], audioMap['audio-3b'], btn, 'audio-3');
            return;
        }

        // 🔥 XỬ LÝ KHÔNG KHỰNG: XÀ CÀO (Nối đầu -> giữa tính toán trước thời gian)
        if (id === 'audio-14') {
            setupSeamlessTransition(audioMap['audio-14a'], audioMap['audio-14b'], btn, 'audio-14');
            return;
        }

        // Dành cho các nút nhạc thông thường
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
            currentMainSound.unload();
        }
        if (nextQueuedSound) {
            nextQueuedSound.stop();
            nextQueuedSound.unload();
        }
        if (currentMainBtn) resetButton(currentMainBtn);

        currentMainSound = null;
        nextQueuedSound = null;
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

    function stopAll() {
        Howler.stop(); 
        document.querySelectorAll('.music-btn').forEach(resetButton);

        if (currentMainSound) currentMainSound.unload();
        if (nextQueuedSound) nextQueuedSound.unload();
        if (currentKenSound) currentKenSound.unload();

        currentMainSound = null;
        nextQueuedSound = null;
        currentMainId = null;
        currentMainBtn = null;

        currentKenSound = null;
        currentKenId = null;
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