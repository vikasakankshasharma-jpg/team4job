
import { getAdminDb } from '@/lib/firebase/server-init';
import { AIFeedback } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic'; // Ensure it's not cached too aggressively

export default async function AIFeedbackPage() {
    const db = getAdminDb();
    const snapshot = await db.collection('ai_feedback').orderBy('createdAt', 'desc').limit(50).get();

    const feedbacks = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAtDate = new Date();
        // Handle Firestore Timestamp
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
            createdAtDate = data.createdAt;
        }

        return {
            id: doc.id,
            ...data,
            createdAt: createdAtDate
        } as AIFeedback & { createdAt: Date };
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">AI User Feedback</h1>

            <div className="grid gap-4">
                {feedbacks.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            No feedback received yet.
                        </CardContent>
                    </Card>
                ) : (
                    feedbacks.map((item) => (
                        <Card key={item.id}>
                            <CardHeader className="dir-row justify-between pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            {item.flowName}
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {item.userId === 'anonymous' ? 'Anon' : item.userId.substring(0, 8)}
                                            </Badge>
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            {item.createdAt.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-full ${item.rating === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.rating === 'positive' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm pt-0">
                                {(item.reason || item.correction) && (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md space-y-2 mb-2">
                                        {item.reason && (
                                            <div className="flex gap-2">
                                                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                <p>{item.reason}</p>
                                            </div>
                                        )}
                                        {item.correction && (
                                            <div className="border-t pt-2 mt-2">
                                                <span className="text-xs font-semibold text-muted-foreground">User Correction:</span>
                                                <p className="italic text-muted-foreground">{item.correction}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {item.metadata && (
                                    <div className="mt-2">
                                        <details className="text-xs text-muted-foreground">
                                            <summary className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">View Context</summary>
                                            <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-auto max-h-40">
                                                {JSON.stringify(item.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
