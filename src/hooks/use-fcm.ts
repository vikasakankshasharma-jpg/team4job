
// hooks/useFcm.ts
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from './use-user';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const useFcm = () => {
  const { app, db } = useFirebase();
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined' || !app || !user) {
      return;
    }
    
    // Ensure the service worker is ready
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then(registration => {
                console.log('Service Worker registration successful with scope: ', registration.scope);
                
                // Request permission and get token only after service worker is ready
                requestPermissionAndToken();
            }).catch(err => {
                console.log('Service Worker registration failed: ', err);
            });
    }

    const requestPermissionAndToken = async () => {
        try {
            const messaging = getMessaging(app);
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Notification permission granted.');

                // Get the token
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                });
                
                if (currentToken) {
                    console.log('FCM Token:', currentToken);
                    
                    // Save the token to the user's document in Firestore
                    if (user) {
                        const userRef = doc(db, 'users', user.id);
                        await updateDoc(userRef, {
                            fcmTokens: arrayUnion(currentToken)
                        });
                        console.log("FCM token saved to user's profile.");
                    }
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Unable to get permission to notify.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
        }
    };
    
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // You can customize the foreground notification here
        new Notification(payload.notification?.title || 'New Notification', {
            body: payload.notification?.body,
            icon: '/icon-192.png'
        });
    });

    return () => {
        unsubscribe();
    };

  }, [app, user, db]);
};
