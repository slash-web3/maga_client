import init, { 
    apply_red_filter, 
    apply_yellow_filter, 
    apply_green_filter, 
    apply_blue_filter, 
    apply_blur_filter,
    save_canvas_snapshot  
} from '../pkg/video_filters.js';

const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let localStream;
let peerConnection;
let ws = new WebSocket('wss://maga-server.onrender.com');
let filter = null;
let videoStarted = false;

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
        }
    };
}

async function handleSignalMessage(message) {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
        if (!peerConnection) createPeerConnection(); // Створюємо з'єднання, якщо його ще немає
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', answer }));
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    } else if (data.type === 'answer') {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    } else if (data.type === 'candidate') {
        if (data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }
}

function setupWebSocket() {
    ws.addEventListener('open', () => {
        console.log('WebSocket connection established.');
        createOffer();
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

async function createOffer() {
    if (!peerConnection) createPeerConnection(); // Створюємо з'єднання
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', offer }));
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

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

    setupWebSocket();
}

main();
