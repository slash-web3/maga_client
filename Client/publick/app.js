// Установіть свої ключі PubNub тут
const PUBLISH_KEY = 'pub-c-12940b5f-0236-4a15-842e-97b74b1ea4de';
const SUBSCRIBE_KEY = 'sub-c-d4f3857c-0a4c-41bb-ac1b-ab46625d6dd7';

// Підключення до PubNub і налаштування WebRTC
var video_out = document.getElementById("vid-box");

function login(form) {
    var phone = window.phone = PHONE({
        number: form.username.value || "Anonymous",
        publish_key: PUBLISH_KEY,
        subscribe_key: SUBSCRIBE_KEY
    });

    phone.ready(function() {
        form.username.style.background = "#55ff5b";
    });

    phone.receive(function(session) {
        session.connected(function(session) {
            video_out.appendChild(session.video);
        });
        session.ended(function(session) {
            video_out.innerHTML = '';
        });
    });

    return false;
}

function makeCall(form) {
    if (!window.phone) {
        alert("Login First!");
    } else {
        phone.dial(form.number.value);
    }
    return false;
}
