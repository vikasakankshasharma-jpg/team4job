import { paymentService } from '../../src/domains/payments/payment.service';
import { paymentRepository } from '../../src/domains/payments/payment.repository';
import { cashfreeClient } from '../../src/domains/payments/cashfree.client';

// Mock dependencies
jest.mock('../../src/domains/payments/payment.repository', () => ({
  paymentRepository: {
    create: jest.fn().mockResolvedValue('test_txn_id'),
    update: jest.fn().mockResolvedValue(true),
    findByOrderId: jest.fn(),
    findByJobId: jest.fn(),
  }
}));

jest.mock('../../src/domains/jobs/job.repository', () => ({
  jobRepository: {
    fetchById: jest.fn(),
  }
}));

jest.mock('../../src/domains/users/user.repository', () => ({
  userRepository: {
    fetchById: jest.fn(),
    incrementStats: jest.fn().mockResolvedValue(true),
  }
}));

jest.mock('../../src/domains/payments/cashfree.client', () => ({
  cashfreeClient: {
    createOrder: jest.fn().mockResolvedValue({ orderId: 'test_order', orderToken: 'test_token' }),
    verifyPayment: jest.fn(),
  }
}));

// Create a spy on isEmulatorMode to force it to return false so we hit the logic
jest.spyOn(paymentService as any, 'isEmulatorMode').mockReturnValue(false);

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentOrder', () => {
    it('should calculate 5% commission for bronze/missing tier', async () => {
      // Setup mocks
      const { jobRepository } = require('../../src/domains/jobs/job.repository');
      jobRepository.fetchById.mockResolvedValue({
        id: 'job1',
        awardedProfessionalId: 'prof1'
      });

      const { userRepository } = require('../../src/domains/users/user.repository');
      userRepository.fetchById
        .mockResolvedValueOnce({ id: 'prof1', professionalProfile: { tierPriority: 1 } }) // for professional
        .mockResolvedValueOnce({ id: 'user1', name: 'Test User', email: 'test@example.com' }); // for payer

      const order = await paymentService.createPaymentOrder({
        jobId: 'job1',
        userId: 'user1',
        amount: 1000,
        travelTip: 50,
      });

      expect(order).toBeDefined();

      const createCall = (paymentRepository.create as jest.Mock).mock.calls[0][0];
      
      // Amount: 1000
      // Commission: 5% of 1000 = 50
      // Client Fee: 2% of 1000 = 20
      // Tip: 50
      // Total Paid by client: 1000 + 20 + 50 = 1070
      // Payout to professional: 1000 - 50 + 50 = 1000
      
      expect(createCall.commission).toBe(50);
      expect(createCall.clientFee).toBe(20);
      expect(createCall.totalPaidByClient).toBe(1070);
      expect(createCall.payoutToProfessional).toBe(1000);
    });

    it('should calculate 2% commission for platinum tier (priority 4)', async () => {
      // Setup mocks
      const { jobRepository } = require('../../src/domains/jobs/job.repository');
      jobRepository.fetchById.mockResolvedValue({
        id: 'job2',
        awardedProfessionalId: 'prof2'
      });

      const { userRepository } = require('../../src/domains/users/user.repository');
      userRepository.fetchById
        .mockResolvedValueOnce({ id: 'prof2', professionalProfile: { tierPriority: 4 } }) // for professional
        .mockResolvedValueOnce({ id: 'user1', name: 'Test User' }); // for payer

      const order = await paymentService.createPaymentOrder({
        jobId: 'job2',
        userId: 'user1',
        amount: 10000,
        travelTip: 100,
      });

      expect(order).toBeDefined();

      const createCall = (paymentRepository.create as jest.Mock).mock.calls[0][0];
      
      // Amount: 10000
      // Commission: 2% of 10000 = 200
      // Client Fee: 2% of 10000 = 200
      // Tip: 100
      // Total Paid by client: 10000 + 200 + 100 = 10300
      // Payout to professional: 10000 - 200 + 100 = 9900
      
      expect(createCall.commission).toBe(200);
      expect(createCall.clientFee).toBe(200);
      expect(createCall.totalPaidByClient).toBe(10300);
      expect(createCall.payoutToProfessional).toBe(9900);
    });
  });
});
