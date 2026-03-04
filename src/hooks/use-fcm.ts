// hooks/useFcm.ts
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from './use-user';
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
                    logger.info('Notification permission granted.');

                    // Get the token
                    const currentToken = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                        serviceWorkerRegistration: registration,
                    });

                    if (currentToken) {
                        logger.debug('FCM Token:', { token: currentToken });

                        // Save the token to the user's document in Firestore
                        if (user && (!user.fcmTokens || !user.fcmTokens.includes(currentToken))) {
                            await userClientService.saveFcmToken(user.id, currentToken);
                            logger.info("FCM token saved to user's profile.");
                        }
                    } else {
                        logger.warn('No registration token available. Request permission to generate one.');
                    }
                } else {
                    logger.warn('Unable to get permission to notify.');
                }
            } catch (err: any) {
                logger.error('An error occurred while retrieving token.', { error: err.message });
            }
        };

        // Ensure the service worker is ready
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                logger.info('Service Worker is active.');
                requestPermissionAndToken(registration);
            }).catch(err => {
                logger.error('Service Worker registration failed to become ready: ', err);
            });
        }

        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            logger.debug('Message received.', { payload });
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
