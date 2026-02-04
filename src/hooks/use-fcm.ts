
// hooks/useFcm.ts
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from './use-user';
import { userClientService } from '@/domains/users/user.client.service';

export const useFcm = () => {
    const { app, db } = useFirebase();
    const { user } = useUser();

    useEffect(() => {
        if (typeof window === 'undefined' || !app || !user) {
            return;
        }

        // Ensure the service worker is ready
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('Service Worker is active.');
                requestPermissionAndToken(registration);
            }).catch(err => {
                console.log('Service Worker registration failed to become ready: ', err);
            });
        }

        const requestPermissionAndToken = async (registration: ServiceWorkerRegistration) => {
            try {
                const messaging = getMessaging(app);
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    console.log('Notification permission granted.');

                    // Get the token
                    const currentToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                        serviceWorkerRegistration: registration,
                    });

                    if (currentToken) {
                        console.log('FCM Token:', currentToken);

                        // Save the token to the user's document in Firestore
                        if (user && (!user.fcmTokens || !user.fcmTokens.includes(currentToken))) {
                            await userClientService.saveFcmToken(user.id, currentToken);
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

