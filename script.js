document.addEventListener('DOMContentLoaded', () => {

    // ====================== PWA + PROGRESS OFFLINE ======================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/nhaclenambo/service-worker.js')
            .then(reg => {
                console.log('✅ Service Worker đăng ký thành công');
            })
            .catch(err => {
                console.log('❌ Service Worker lỗi:', err);
            });
    }

    // Progress elements
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    function updateProgress(percent) {
        progressFill.style.width = percent + '%';
        progressText.textContent = `Đã Tải: ${Math.round(percent)}%`;
        
        if (percent >= 100) {
            setTimeout(() => {
                progressText.innerHTML = '✅ Đã Tải Xong – Có thể dùng Offline';
                progressText.style.color = '#00FF88';
            }, 600);
        }
    }

    // Nhận tiến độ từ Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'CACHE_PROGRESS') {
            updateProgress(event.data.percent);
        }
    });

    // ====================== MUSIC PLAYER CODE (giữ nguyên logic cũ) ======================
    const buttons = document.querySelectorAll('.music-btn');

    let currentMain = null;
    let currentMainBtn = null;
    let currentKen = null;
    let currentKenBtn = null;
    let holdTimeout = null;

    const noLoopList = ['audio-1','audio-4','audio-9','audio-10','audio-15'];

    buttons.forEach(button => {
        const id = button.dataset.audioId;
        let pressStart = 0;

        button.addEventListener('mousedown', startPress);
        button.addEventListener('mouseup', endPress);
        button.addEventListener('touchstart', startPress);
        button.addEventListener('touchend', endPress);

        function startPress(e){
            e.preventDefault();
            pressStart = Date.now();
            holdTimeout = setTimeout(() => stopAll(), 500);
        }

        function endPress(e){
            e.preventDefault();
            clearTimeout(holdTimeout);
            if(Date.now() - pressStart < 500){
                handleClick(id, button);
            }
        }
    });

    function getType(id){
        if(id === 'audio-1') return 'solo';
        if(['audio-5','audio-6'].includes(id)) return 'ken';
        return 'main';
    }

    function handleClick(id, btn){
        const type = getType(id);

        if(type === 'solo'){
            stopAll();
            playMain(id, btn);
            return;
        }

        if(type === 'ken'){
            let audio = document.getElementById(id);
            if(currentKen === audio){
                if(!audio.paused){
                    audio.pause();
                    setPaused(btn);
                }else{
                    audio.play();
                    setPlaying(btn);
                }
                return;
            }
            stopKen();
            playKen(id, btn);
            return;
        }

        let audio = getAudio(id);

        if(currentMain === audio){
            if(!audio.paused){
                audio.pause();
                setPaused(btn);
            }else{
                audio.play();
                setPlaying(btn);
            }
            return;
        }

        stopMain();
        stopXaCao();
        playMain(id, btn);
    }

    function getAudio(id){
        if(id === 'audio-3') return document.getElementById('audio-3b');
        if(id === 'audio-14') return document.getElementById('audio-14b');
        return document.getElementById(id);
    }

    function playMain(id, btn){
        if(id === 'audio-3'){
            let first = document.getElementById('audio-3');
            let second = document.getElementById('audio-3b');
            first.pause(); second.pause();
            first.currentTime = 0; second.currentTime = 0;
            first.onended = null; second.ontimeupdate = null;

            first.play();
            setPlaying(btn);
            currentMainBtn = btn;

            first.onended = () => {
                first.pause();
                second.currentTime = 0;
                second.play();
                second.ontimeupdate = () => {
                    if(second.duration && second.currentTime >= second.duration - 0.1){
                        second.currentTime = 0;
                        second.play();
                    }
                };
                currentMain = second;
            };
            return;
        }

        if(id === 'audio-14'){
            let first = document.getElementById('audio-14a');
            let second = document.getElementById('audio-14b');
            first.pause(); second.pause();
            first.currentTime = 0; second.currentTime = 0;
            first.onended = null; second.ontimeupdate = null;

            first.play();
            setPlaying(btn);
            currentMainBtn = btn;

            first.onended = () => {
                first.pause();
                second.currentTime = 0;
                second.play();
                second.ontimeupdate = () => {
                    if(second.duration && second.currentTime >= second.duration - 0.1){
                        second.currentTime = 0;
                        second.play();
                    }
                };
                currentMain = second;
            };
            return;
        }

        let audio = document.getElementById(id);
        currentMain = audio;
        currentMainBtn = btn;
        setupAudio(audio, btn, id);
    }

    function playKen(id, btn){
        let audio = document.getElementById(id);
        currentKen = audio;
        currentKenBtn = btn;
        setupAudio(audio, btn, id);
    }

    function setupAudio(audio, btn, id){
        audio.onended = null;
        audio.ontimeupdate = null;
        audio.play();

        if(!noLoopList.includes(id)){
            audio.ontimeupdate = () => {
                if(audio.duration && audio.currentTime >= audio.duration - 0.1){
                    audio.currentTime = 0;
                    audio.play();
                }
            };
        } else {
            audio.onended = () => resetButton(btn);
        }

        setPlaying(btn);
    }

    function stopMain(){
        if(currentMain){
            currentMain.pause();
            currentMain.currentTime = 0;
        }
        if(currentMainBtn) resetButton(currentMainBtn);
        currentMain = null;
        currentMainBtn = null;
    }

    function stopKen(){
        if(currentKen){
            currentKen.pause();
            currentKen.currentTime = 0;
        }
        if(currentKenBtn) resetButton(currentKenBtn);
        currentKen = null;
        currentKenBtn = null;
    }

    function stopXaCao(){
        ['audio-14a','audio-14b'].forEach(id => {
            let a = document.getElementById(id);
            if(a){
                a.pause();
                a.currentTime = 0;
            }
        });
    }

    function stopAll(){
        document.querySelectorAll('audio').forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        document.querySelectorAll('.music-btn').forEach(resetButton);
        currentMain = null;
        currentKen = null;
    }

    function setPlaying(btn){
        btn.style.color = "#FFD700";
        btn.style.animation = "blink 1s infinite";
    }

    function setPaused(btn){
        btn.style.color = "#00AEEF";
        btn.style.animation = "none";
    }

    function resetButton(btn){
        btn.style.color = "#000";
        btn.style.animation = "none";
    }
});
