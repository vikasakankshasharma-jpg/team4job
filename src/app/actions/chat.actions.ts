'use server';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { ChatRoom } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function getOrCreateChatRoomAction(jobId: string, jobTitle: string, professionalId: string, clientId: string) {
    try {
        const db = getAdminDb();
        const roomsRef = db.collection('chats');
        
        // Find existing room
        const querySnapshot = await roomsRef
            .where('jobId', '==', jobId)
            .where('participants', 'array-contains', clientId)
            .get();
            
        let existingRoom: any = null;
        querySnapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.participants.includes(professionalId)) {
                existingRoom = { id: doc.id, ...data };
            }
        });

        if (existingRoom) {
            return { success: true, roomId: existingRoom.id };
        }

        // Create new room
        const newRoomId = uuidv4();
        const newRoom: ChatRoom = {
            id: newRoomId,
            jobId,
            jobTitle,
            participants: [clientId, professionalId],
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        await roomsRef.doc(newRoomId).set(newRoom);
        return { success: true, roomId: newRoomId };
    } catch (error: any) {
        console.error("Error creating chat room:", error);
        return { success: false, error: error.message };
    }
}



