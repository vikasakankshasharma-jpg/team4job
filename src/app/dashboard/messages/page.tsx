import { Metadata } from 'next';

import MessagesClient from './messages-client';


export const metadata: Metadata = {
    title: 'Messages | DoDo',
    description: 'Direct messaging',
};

export default async function MessagesPage({ searchParams }: { searchParams: { roomId?: string } }) {
    

    return (
        
            <MessagesClient initialRoomId={searchParams.roomId} />
        
    );
}

