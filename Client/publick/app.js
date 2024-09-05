import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter 
} from '../pkg/video_filters.js';

// Підключення до WebSocket сервера
let ws = new WebSocket('wss://maga-server.onrender.com');
let filter = null;
let isRemoteStream = false;
let remoteVideoBlob = null;

const frameRate = 15;
const frameInterval = 1000 / frameRate;
let lastFrameTime = 0;

async function main() {
    await init();

    const canvas = document.getElementById('videoCanvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    function draw(timestamp) {
        if (timestamp - lastFrameTime >= frameInterval) {
            lastFrameTime = timestamp;

            if (isRemoteStream && remoteVideoBlob) {
                const remoteVideo = new Image();
                remoteVideo.src = URL.createObjectURL(remoteVideoBlob);
                remoteVideo.onload = () => {
                    context.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
                    applyFilter(filter);
                    URL.revokeObjectURL(remoteVideo.src); // Очищуємо пам'ять
                };
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
            default:
                break;
        }
    }

    // Фільтри
    document.getElementById('redFilterBtn').addEventListener('click', () => filter = 'red');
    document.getElementById('yellowFilterBtn').addEventListener('click', () => filter = 'yellow');
    document.getElementById('greenFilterBtn').addEventListener('click', () => filter = 'green');
    document.getElementById('blueFilterBtn').addEventListener('click', () => filter = 'blue');
    document.getElementById('blurFilterBtn').addEventListener('click', () => filter = 'blur');

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
        isRemoteStream = true; // Вмикаємо відображення отриманого відео
    });

    requestAnimationFrame(draw);
}

main();
