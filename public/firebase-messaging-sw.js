// Import and configure the Firebase SDK
// This script is run in the background by the browser, and handles notifications when the app is not active.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyC0NaO2x65_mdXpe1S62l2bwoc3KZwjn3o',
  authDomain: 'dodo-beta.firebaseapp.com',
  projectId: 'dodo-beta',
  storageBucket: 'dodo-beta.firebasestorage.app',
  messagingSenderId: '912974459558',
  appId: '1:912974459558:web:0d04a5c2d3373c28547a67',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
