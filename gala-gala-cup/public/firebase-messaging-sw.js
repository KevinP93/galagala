/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…"
});

const messaging = firebase.messaging();

// Quand la notif arrive alors que l'app est en arrière-plan / fermée
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'GalaGala CUP';
  const body = payload?.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/gala-192.png'
  });
});
