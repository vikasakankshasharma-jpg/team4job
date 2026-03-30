
import { db as clientDb } from './client';
import { getAdminDb } from './admin';

/**
 * Returns the appropriate Firestore instance based on the current environment.
 * On the server (SSR, Server Actions, API Routes), it returns the Admin SDK instance.
 * On the client (Browser), it returns the Client SDK instance.
 */
export const getDb = () => {
    if (typeof window === 'undefined') {
        return getAdminDb();
    }
    return clientDb;
};
