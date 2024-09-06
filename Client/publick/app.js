import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter,
    save_canvas_snapshot  
} from '../pkg/video_filters.js';

// Параметри WebRTC
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Змінні для WebRTC
let localStream;
let peerConnection;
let ws = new WebSocket('wss://maga-server.onrender.com');
let filter = null;
let videoStarted = false; // Додана змінна для перевірки, чи запущено відео

// Функція для налаштування відео
async function startVideo() {
    if (videoStarted) return; // Якщо відео вже запущено, не запускати знову
    videoStarted = true;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoCanvas = document.getElementById('videoCanvas');
        const context = videoCanvas.getContext('2d');
        const video = document.createElement('video');
        video.srcObject = localStream;
        video.autoplay = true;
        video.onloadedmetadata = () => {
            videoCanvas.width = video.videoWidth;
            videoCanvas.height = video.videoHeight;
            drawFrame();
        };

        function drawFrame() {
            if (videoStarted) {
                context.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
                if (filter) {
                    applyFilter(filter); // Застосування фільтра до кожного кадру
                }
                requestAnimationFrame(drawFrame);
            }
        }

        createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Функція для зупинки відео
function stopVideo() {
    if (!videoStarted) return; // Якщо відео не запущено, нічого не робити
    videoStarted = false;

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Очистити canvas
    const videoCanvas = document.getElementById('videoCanvas');
    const context = videoCanvas.getContext('2d');
    context.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

    // Скидання активного фільтру
    filter = null;
}

// Функція для створення PeerConnection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        const videoCanvas = document.getElementById('videoCanvas');
        const context = videoCanvas.getContext('2d');
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = remoteStream;
        remoteVideo.autoplay = true;
        remoteVideo.onloadedmetadata = () => {
            videoCanvas.width = remoteVideo.videoWidth;
            videoCanvas.height = remoteVideo.videoHeight;
            drawRemoteFrame();
        };

        function drawRemoteFrame() {
            if (remoteStream.active) {
                context.drawImage(remoteVideo, 0, 0, videoCanvas.width, videoCanvas.height);
                requestAnimationFrame(drawRemoteFrame);
            }
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'disconnected') {
            console.log('ICE connection disconnected.');
            // Можливо, потрібно знову підключитися
        }
    };
}

// Функція для обробки сигналів через WebSocket
async function handleSignalMessage(message) {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', answer }));
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate') {
        if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }
}

// Налаштування WebSocket
function setupWebSocket() {
    ws.addEventListener('open', () => {
        console.log('WebSocket connection established.');
    });

    ws.addEventListener('message', (event) => {
        handleSignalMessage(event.data);
    });

    ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.addEventListener('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => {
            ws = new WebSocket('wss://maga-server.onrender.com');
            setupWebSocket(); // Перепідключаємо WebSocket
        }, 5000);
    });
}

// Функція для застосування фільтрів
function applyFilter(filter) {
    const videoCanvas = document.getElementById('videoCanvas');
    const context = videoCanvas.getContext('2d');
    const imageData = context.getImageData(0, 0, videoCanvas.width, videoCanvas.height);

    switch (filter) {
        case 'red':
            apply_red_filter(imageData.data, videoCanvas.width, videoCanvas.height);
            break;
        case 'yellow':
            apply_yellow_filter(imageData.data, videoCanvas.width, videoCanvas.height);
            break;
        case 'green':
            apply_green_filter(imageData.data, videoCanvas.width, videoCanvas.height);
            break;
        case 'blue':
            apply_blue_filter(imageData.data, videoCanvas.width, videoCanvas.height);
            break;
        case 'blur':
            apply_blur_filter(imageData.data, videoCanvas.width, videoCanvas.height);
            break;
        case 'snapshot':
            save_canvas_snapshot(videoCanvas);
            filter = null; // Скидання фільтру після знімка
            break;
        default:
            break;
    }

    // Малюємо оброблене зображення назад на canvas
    context.putImageData(imageData, 0, 0);
}

// Основна функція
async function main() {
    await init();

    // Обробка фільтрів
    document.getElementById('redFilterBtn').addEventListener('click', () => filter = 'red');
    document.getElementById('yellowFilterBtn').addEventListener('click', () => filter = 'yellow');
    document.getElementById('greenFilterBtn').addEventListener('click', () => filter = 'green');
    document.getElementById('blueFilterBtn').addEventListener('click', () => filter = 'blue');
    document.getElementById('blurFilterBtn').addEventListener('click', () => filter = 'blur');
    document.getElementById('snapshotBtn').addEventListener('click', () => {
        if (videoStarted) {
            const dataURL = document.getElementById('videoCanvas').toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'snapshot.png';
            link.click();
        }
    });

    document.getElementById('startBtn').addEventListener('click', startVideo);
    document.getElementById('stopBtn').addEventListener('click', stopVideo);

    setupWebSocket();
}

main();
