import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter 
} from '../pkg/video_filters.js';

// Параметри WebRTC
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Змінні для WebRTC
let localStream;
let peerConnection;
let ws = new WebSocket('wss://maga-server.onrender.com');
let filter = null;
let isRemoteStream = false;

// Функція для налаштування відео
async function startVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('videoCanvas').srcObject = localStream;
        createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

// Функція для створення PeerConnection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('videoCanvas');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
        isRemoteStream = true; // Вмикаємо відображення отриманого відео
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

// Основна функція
async function main() {
    await init();

    // Обробка фільтрів
    document.getElementById('redFilterBtn').addEventListener('click', () => filter = 'red');
    document.getElementById('yellowFilterBtn').addEventListener('click', () => filter = 'yellow');
    document.getElementById('greenFilterBtn').addEventListener('click', () => filter = 'green');
    document.getElementById('blueFilterBtn').addEventListener('click', () => filter = 'blue');
    document.getElementById('blurFilterBtn').addEventListener('click', () => filter = 'blur');

    setupWebSocket();

    // Старт відео при завантаженні сторінки
    startVideo();
}

main();
