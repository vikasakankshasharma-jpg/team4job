// hooks/useFcm.ts
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useUser } from './use-user';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { userClientService } from '@/domains/users/user.client.service';
import { logger } from '@/infrastructure/logger';

export const useFcm = () => {
    const { app, db } = useFirebase();
    const { user } = useUser();

    useEffect(() => {
        if (typeof window === 'undefined' || !app || !user) {
            return;
        }

        const requestPermissionAndToken = async (registration: ServiceWorkerRegistration) => {
            try {
                const messaging = getMessaging(app);
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    // Get the token
                    const currentToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                        serviceWorkerRegistration: registration,
                    });

                    if (currentToken) {
                        // Save the token to the user's document in Firestore
                        if (user && (!user.fcmTokens || !user.fcmTokens.includes(currentToken))) {
                            await userClientService.saveFcmToken(user.id, currentToken);
                        }
                    } else {
                        // No registration token available
                    }
                } else {
                    // Permission not granted
                }
            } catch (err: any) {
                // Error retrieving token
            }
        };

        // Ensure the service worker is ready
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                requestPermissionAndToken(registration);
            }).catch(err => {
                // Service Worker registration failed to become ready
            });
        }

        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
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
