import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter,
    save_canvas_snapshot 
} from '../pkg/video_filters.js';

// Підключення до WebSocket сервера
let ws = new WebSocket('wss://maga-server.onrender.com');
let filter = null;
let video = null;
let isVideoPlaying = false;
let stream;
let isRemoteStream = false; // Флаг для відображення отриманого відео

const frameRate = 15; // Кількість кадрів на секунду
const frameInterval = 1000 / frameRate;
let lastFrameTime = 0;

async function main() {
    await init();

    const canvas = document.getElementById('videoCanvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    let remoteVideoBlob = null; // Для збереження отриманого через WebSocket відео

    function draw(timestamp) {
        if (timestamp - lastFrameTime >= frameInterval) {
            lastFrameTime = timestamp;

            if (isRemoteStream && remoteVideoBlob) {
                const remoteVideo = new Image();
                remoteVideo.src = URL.createObjectURL(remoteVideoBlob);
                remoteVideo.onload = () => {
                    context.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(remoteVideo.src); // Очищуємо пам'ять
                };
            } else if (video && video.videoWidth > 0 && video.videoHeight > 0 && isVideoPlaying) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                applyFilter(filter);
                sendFrameToServer(canvas);
            }
        }
        requestAnimationFrame(draw);
    }

    function applyFilter(filter) {
        switch (filter) {
            case 'red':
                apply_red_filter('videoCanvas');
                break;
            case 'yellow':
                apply_yellow_filter('videoCanvas');
                break;
            case 'green':
                apply_green_filter('videoCanvas');
                break;
            case 'blue':
                apply_blue_filter('videoCanvas');
                break;
            case 'blur':
                apply_blur_filter('videoCanvas');
                break;
            case 'snapshot':
                save_canvas_snapshot('videoCanvas');
                filter = null;
                break;
            default:
                break;
        }
    }

    function sendFrameToServer(canvas) {
        // Відправка поточного кадру як Blob через WebSocket
        if (ws.readyState === WebSocket.OPEN) {
            canvas.toBlob(blob => {
                if (blob) {
                    ws.send(blob); // Відправляємо кадр
                }
            });
        }
    }

    // Старт трансляції
    document.getElementById('startBtn').addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video = document.createElement('video');
            video.srcObject = stream;
            video.width = canvas.width;
            video.height = canvas.height;
            video.autoplay = true;

            video.addEventListener('play', function() {
                isVideoPlaying = true;
                isRemoteStream = false; // Використовуємо локальне відео
                setTimeout(() => requestAnimationFrame(draw), 100);
            });
        } catch (err) {
            console.error('Не вдалося отримати доступ до камери:', err);
        }
    });

    // Зупинка трансляції
    document.getElementById('stopBtn').addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        filter = null;
        isVideoPlaying = false;
    });

    // Фільтри
    document.getElementById('redFilterBtn').addEventListener('click', () => {
        if (isVideoPlaying) filter = 'red';
    });
    document.getElementById('yellowFilterBtn').addEventListener('click', () => {
        if (isVideoPlaying) filter = 'yellow';
    });
    document.getElementById('greenFilterBtn').addEventListener('click', () => {
        if (isVideoPlaying) filter = 'green';
    });
    document.getElementById('blueFilterBtn').addEventListener('click', () => {
        if (isVideoPlaying) filter = 'blue';
    });
    document.getElementById('blurFilterBtn').addEventListener('click', () => {
        if (isVideoPlaying) filter = 'blur';
    });

    // Зйомка скріншоту
    document.getElementById('snapshotBtn').addEventListener('click', () => {
        if (isVideoPlaying) {
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'snapshot.png';
            link.click();
        }
    });

    // Підключення до WebSocket сервера
    ws.addEventListener('open', () => {
        console.log('WebSocket connection established.');
    });

    ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.addEventListener('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => {
            ws = new WebSocket('wss://maga-server.onrender.com');
        }, 5000);
    });

    // Обробка отриманих відео-кадрів
    ws.addEventListener('message', (event) => {
        remoteVideoBlob = new Blob([event.data]); // Отримуємо Blob з даних
        isRemoteStream = true; // Переходимо на відображення отриманого відео
    });
}

main();
