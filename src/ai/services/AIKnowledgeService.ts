

import { ai } from '@/ai/genkit';
import { textEmbedding004 } from '@genkit-ai/vertexai';
import { getAdminDb } from '@/lib/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

export interface AIDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
    embedding: number[];
    createdAt: Date;
}

const COLLECTION_NAME = 'ai_knowledge_base';

export const aiKnowledgeService = {
    /**
     * Index a document: Generate embedding and save to Firestore.
     */
    async indexDocument(content: string, metadata: Record<string, any> = {}): Promise<string> {
        try {
            // 1. Generate Embedding
            // Note: In Genkit v0.9+, embed() might aid this.
            // Using the ai.embed abstraction if available, or direct model usage.
            // ai.embed({ model: textEmbedding004, content })

            // We use the `ai` instance configured in genkit.ts
            // Check if ai.embed is available on the instance or we use a separate import.
            // The `genkit` instance usually has helpers. 
            // However, with @genkit-ai/googleai, we might need to use the embedder directly if 'ai' is just the configured instance.

            // Actually, genkit() returns a registry/instance that *can* have methods if used in flows, 
            // but for direct tool usage, we might be better off using `ai.embed` if exported, 
            // or the `embed` function from 'genkit' package if strictly following recent docs.

            // For now, let's assume `ai.embed` works if we typed it as `any` or standard Genkit instance.
            // If not, we will fix.

            const embeddingResult = await ai.embed({
                embedder: textEmbedding004,
                content: content
            });

            // embeddingResult is usually number[] directly or an object with embedding.
            // Genkit 0.9+: returns number[] directly or object?
            // Let's assume number[] based on typical usage, or check response.
            // Actually `ai.embed` returns `Promise<EmbedResponse>` usually.

            const embedding = Array.isArray(embeddingResult) ? embeddingResult : embeddingResult.embedding;

            const db = getAdminDb();
            const docRef = db.collection(COLLECTION_NAME).doc();

            const docData = {
                content,
                metadata,
                embedding,
                createdAt: FieldValue.serverTimestamp()
            };

            await docRef.set(docData);
            console.log(`[AIKnowledge] Indexed doc ${docRef.id}`);
            return docRef.id;

        } catch (error) {
            console.error("[AIKnowledge] Indexing failed:", error);
            throw error;
        }
    },

    /**
     * Search for similar documents using Cosine Similarity.
     * Note: For large datasets, use a vector DB or Firebase Vector Search extension.
     * This relies on client-side (server function) sorting for this MVP (Phase 6).
     */
    async searchSimilar(query: string, limit: number = 3): Promise<AIDocument[]> {
        try {
            const queryEmbeddingResult = await ai.embed({
                embedder: textEmbedding004,
                content: query
            });
            const queryVector = Array.isArray(queryEmbeddingResult) ? queryEmbeddingResult : queryEmbeddingResult.embedding;

            const db = getAdminDb();
            // Fetch ALL docs (Warning: Only scalable for < 1000 docs. Good for Phase 6 MVP)
            const snapshot = await db.collection(COLLECTION_NAME).get();

            const docs: (AIDocument & { similarity: number })[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.embedding) {
                    const similarity = cosineSimilarity(queryVector, data.embedding);
                    docs.push({
                        id: doc.id,
                        content: data.content,
                        metadata: data.metadata,
                        embedding: data.embedding,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        similarity
                    });
                }
            });

            // Sort by similarity desc
            docs.sort((a, b) => b.similarity - a.similarity);

            return docs.slice(0, limit);

        } catch (error) {
            console.error("[AIKnowledge] Search failed:", error);
            return [];
        }
    }
};

// Helper: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}
