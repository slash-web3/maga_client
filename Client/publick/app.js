import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter,
    save_canvas_snapshot  
} from '../pkg/video_filters.js';

// Параметри WebRTC
const servers = {
    iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        // Додаткові STUN/TURN сервери тут
    ]
};

// Налаштування PubNub
const pubnub = new PubNub({
    publishKey: 'pub-c-12940b5f-0236-4a15-842e-97b74b1ea4de', // Ваш публічний ключ
    subscribeKey: 'sub-c-d4f3857c-0a4c-41bb-ac1b-ab46625d6dd7', // Ваш підписний ключ
    uuid: 'user-' + Math.random().toString(36).substr(2, 9)
});

// Змінні для WebRTC
let localStream;
let peerConnection;
let remoteStream;
let filter = null;
let videoStarted = false;

// Функція для налаштування відео
async function startVideo() {
    if (videoStarted) return; 
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
                    applyFilter(filter);
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
    if (!videoStarted) return;
    videoStarted = false;

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    const videoCanvas = document.getElementById('videoCanvas');
    const context = videoCanvas.getContext('2d');
    context.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

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
            pubnub.publish({
                channel: 'webrtc-channel',
                message: { type: 'candidate', candidate: event.candidate }
            });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'disconnected') {
            console.log('ICE connection disconnected.');
        }
    };
}

// Функція для обробки сигналів через PubNub
async function handleSignalMessage(message) {
    const data = message.message;

    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        pubnub.publish({
            channel: 'webrtc-channel',
            message: { type: 'answer', answer }
        });
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate') {
        if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }
}

// Налаштування PubNub
function setupPubNub() {
    pubnub.subscribe({
        channels: ['webrtc-channel']
    });

    pubnub.addListener({
        message: (event) => {
            handleSignalMessage(event);
        },
        status: (statusEvent) => {
            if (statusEvent.category === "PNConnectedCategory") {
                console.log('PubNub connection established.');
            } else if (statusEvent.category === "PNDisconnectedCategory") {
                console.log('PubNub connection closed.');
            }
        },
        error: (error) => {
            console.error('PubNub error:', error);
        }
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
            filter = null; 
            break;
        default:
            break;
    }
}

// Основна функція
async function main() {
    await init();

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

    setupPubNub();
}

main();
