import { useState, useEffect } from 'react';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { ChatRoom, ChatMessage } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function useChatStream(roomId: string | null) {
    const { db, storage } = useFirebase();
    const { user } = useUser();
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId || !db || !user) {
            const timer = setTimeout(() => {
                setMessages([]);
                setRoom(null);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        // Listen to room metadata
        const roomRef = doc(db, 'chats', roomId);
        const unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                setRoom({ id: docSnap.id, ...docSnap.data() } as ChatRoom);
            }
        });

        // Listen to messages
        const messagesRef = collection(db, 'chats', roomId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        
        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
            const msgs: ChatMessage[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
                } as ChatMessage);
            });
            setMessages(msgs);
            setLoading(false);
        });

        return () => {
            unsubscribeRoom();
            unsubscribeMessages();
        };
    }, [roomId, db, user]);

    const sendMessage = async (text: string, file?: File) => {
        if (!roomId || !db || !user) return;
        
        let attachmentUrl = undefined;
        
        if (file && storage) {
            const fileRef = ref(storage, `chats/${roomId}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            attachmentUrl = await getDownloadURL(fileRef);
        }

        const messagesRef = collection(db, 'chats', roomId, 'messages');
        await addDoc(messagesRef, {
            roomId,
            senderId: user.id,
            text,
            attachmentUrl,
            readBy: [user.id],
            createdAt: serverTimestamp()
        });

        // Update room's lastMessage and updatedAt
        const roomRef = doc(db, 'chats', roomId);
        await updateDoc(roomRef, {
            lastMessage: file ? 'Sent an attachment' : text,
            updatedAt: new Date().toISOString()
        });
    };

    return { messages, room, loading, sendMessage };
}

export function useChatRooms() {
    const { db } = useFirebase();
    const { user } = useUser();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !user?.id) {
            const timer = setTimeout(() => {
                setRooms([]);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        const roomsRef = collection(db, 'chats');
        const q = query(roomsRef, where('participants', 'array-contains', user.id));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const rms: ChatRoom[] = [];
            querySnapshot.forEach((doc) => {
                rms.push({ id: doc.id, ...doc.data() } as ChatRoom);
            });
            // Sort by updatedAt desc locally since we can't always compound index easily on array-contains
            rms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setRooms(rms);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, user?.id]);

    return { rooms, loading };
}



