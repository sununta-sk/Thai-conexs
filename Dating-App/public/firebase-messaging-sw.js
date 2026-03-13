importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyBv61jwRcBESzuXqWGA0iMGTIeVbmQviR0",
  authDomain:        "dating-app-b46b2.firebaseapp.com",
  projectId:         "dating-app-b46b2",
  storageBucket:     "dating-app-b46b2.firebasestorage.app",
  messagingSenderId: "694917487035",
  appId:             "1:694917487035:web:aab26a024efc1660becc9e",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Dating App", {
    body:    body || "คุณมีการแจ้งเตือนใหม่",
    icon:    icon || "/logo192.png",
    badge:   "/logo192.png",
    data, 50, 100],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
