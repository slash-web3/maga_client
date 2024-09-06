import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter,
    save_canvas_snapshot  
} from '../pkg/video_filters.js';

// Параметри WebRTC
// Параметри WebRTC з STUN і TURN серверами
const servers = {
    iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' },
        { url: 'stun:stun01.sipphone.com' },
        { url: 'stun:stun.ekiga.net' },
        { url: 'stun:stun.fwdnet.net' },
        { url: 'stun:stun.ideasip.com' },
        { url: 'stun:stun.iptel.org' },
        { url: 'stun:stun.rixtelecom.se' },
        { url: 'stun:stun.schlund.de' },
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'stun:stun2.l.google.com:19302' },
        { url: 'stun:stun3.l.google.com:19302' },
        { url: 'stun:stun4.l.google.com:19302' },
        { url: 'stun:stunserver.org' },
        { url: 'stun:stun.softjoys.com' },
        { url: 'stun:stun.voiparound.com' },
        { url: 'stun:stun.voipbuster.com' },
        { url: 'stun:stun.voipstunt.com' },
        { url: 'stun:stun.voxgratia.org' },
        { url: 'stun:stun.xten.com' },
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
};

// Змінні для WebRTC
let localStream;
let peerConnection;
let remoteStream;
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
        const videoCanvas = document.getElementById('videoCanvas');
        const context = videoCanvas.getContext('2d');
        const remoteVideo = document.createElement('video');
        remoteStream = event.streams[0];
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
            filter = null; // Скидання фільтру після знімка
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
