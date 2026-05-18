import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FinancialException, CreateExceptionInput, ExceptionStatus } from './financial-exception.types';
import { caseService } from '../cases/case.service';
import { paymentRepository } from '../payments/payment.repository';
import { Timestamp } from 'firebase-admin/firestore';
import { applyEnvelope } from '@/lib/schema/schema-envelope';

export class FinancialExceptionService {
  private get collection() {
    return getAdminDb().collection('financial_exceptions');
  }

  async raiseException(input: CreateExceptionInput): Promise<string> {
    const db = getAdminDb();
    
    const exceptionData: Omit<FinancialException, 'id'> = {
      type: input.type,
      status: 'open',
      transactionId: input.transactionId,
      amountExpected: input.amountExpected,
      amountActual: input.amountActual,
      detectedAt: Timestamp.now(),
      notes: input.notes,
      tenantId: 'team4job',
      schemaVersion: 1,
      region: 'IN',
      vertical: 'skilled_trades'
    };

    const docRef = await this.collection.add(applyEnvelope(exceptionData));
    const exceptionId = docRef.id;

    // Escalation rule: If amount at risk/actual exceeds 10,000 INR, escalate to Case Management automatically
    const maxSafeThreshold = 10000;
    if (input.amountActual > maxSafeThreshold || input.type === 'refund_above_threshold') {
      const caseId = await caseService.openCase({
        type: 'refund',
        priority: 'high',
        severity: 'high',
        slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour tight SLA
        linkedEntities: [
          { type: 'transaction', id: input.transactionId },
          { type: 'dispute', id: exceptionId } // Reusing dispute type or creating generic link
        ],
        riskScore: 80,
        amountAtRisk: input.amountActual,
        title: `Escalated FinOps Exception: ${input.type.toUpperCase()}`,
        description: `Auto-escalated high-value exception (${input.amountActual} INR). Notes: ${input.notes || 'None'}`
      });

      await this.collection.doc(exceptionId).update({
        status: 'escalated',
        caseId
      });
    }

    return exceptionId;
  }

  async detectExceptions(transactionId: string): Promise<void> {
    const transaction = await paymentRepository.findById(transactionId);
    if (!transaction) return;

    // Check 1: payout mismatch
    const expectedPayout = transaction.amount - transaction.commission + (transaction.travelTip || 0);
    if (transaction.payoutToProfessional !== expectedPayout) {
      await this.raiseException({
        type: 'payout_mismatch',
        transactionId,
        amountExpected: expectedPayout,
        amountActual: transaction.payoutToProfessional,
        notes: `Mismatch detected in professional payout calculation. Expected: ${expectedPayout}, Got: ${transaction.payoutToProfessional}`
      });
    }

    // Check 2: refund above threshold
    if (transaction.status === 'refunded' && transaction.totalPaidByClient > 10000) {
      await this.raiseException({
        type: 'refund_above_threshold',
        transactionId,
        amountExpected: 0,
        amountActual: transaction.totalPaidByClient,
        notes: `High-value refund executed for transaction. Total refunded: ${transaction.totalPaidByClient} INR`
      });
    }
  }

  async listExceptions(status?: ExceptionStatus): Promise<FinancialException[]> {
    let query = this.collection.orderBy('detectedAt', 'desc');
    if (status) {
      query = query.where('status', '==', status) as any;
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialException));
  }
}

export const financialExceptionService = new FinancialExceptionService();
