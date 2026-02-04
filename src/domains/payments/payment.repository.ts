
import { Transaction } from "@/domains/payments/payment.types";
import { getAdminDb } from "@/infrastructure/firebase/admin";
import { COLLECTIONS } from "@/infrastructure/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";

export class PaymentRepository {
    private get db() {
        return getAdminDb();
    }

    private get collection() {
        return this.db.collection(COLLECTIONS.TRANSACTIONS);
    }

    async create(data: Partial<Transaction>): Promise<string> {
        const docRef = await this.collection.add(data);
        return docRef.id;
    }

    async update(id: string, data: Partial<Transaction>): Promise<void> {
        await this.collection.doc(id).update(data);
    }

    async findById(id: string): Promise<Transaction | null> {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Transaction;
    }

    async findByOrderId(orderId: string): Promise<{ id: string; data: Transaction } | null> {
        const snapshot = await this.collection
            .where("paymentGatewayOrderId", "==", orderId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, data: { id: doc.id, ...doc.data() } as Transaction };
    }

    async findByJobId(jobId: string): Promise<Transaction[]> {
        const snapshot = await this.collection
            .where("jobId", "==", jobId)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }

    async findByPayerId(userId: string): Promise<Transaction[]> {
        const snapshot = await this.collection
            .where("payerId", "==", userId)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }

    async findByPayeeId(userId: string): Promise<Transaction[]> {
        const snapshot = await this.collection
            .where("payeeId", "==", userId)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    }
}

export const paymentRepository = new PaymentRepository();
