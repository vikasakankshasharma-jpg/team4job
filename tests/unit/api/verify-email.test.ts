/** @jest-environment node */
import { POST } from '../../../src/app/api/auth/verify-email/route';
import { sendServerEmail } from '@/lib/server-email';
import { getAdminDb } from '@/lib/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

// Mocks
jest.mock('@/lib/server-email', () => ({
    sendServerEmail: jest.fn(),
}));

jest.mock('@/lib/firebase/server-init', () => ({
    getAdminDb: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
    Timestamp: {
        fromDate: jest.fn((date) => ({ toMillis: () => date.getTime() })),
        now: jest.fn(() => ({ toMillis: () => Date.now() })),
    }
}));

// Helper to create mock request
const createMockRequest = (body: any): NextRequest => {
    return {
        json: async () => body,
    } as unknown as NextRequest;
};

describe('verify-email API', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDoc = {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
        };
        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
        };
        (getAdminDb as jest.Mock).mockReturnValue({
            collection: jest.fn().mockReturnValue(mockCollection)
        });
    });

    it('should return 400 if email is missing', async () => {
        const req = createMockRequest({ action: 'send' });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
    });

    it('should send OTP successfully', async () => {
        const req = createMockRequest({ email: 'test@example.com', action: 'send' });
        const res = await POST(req);
        const data = await res.json();

        expect(mockCollection.doc).toHaveBeenCalledWith('test@example.com');
        expect(mockDoc.set).toHaveBeenCalled(); // OTP store
        expect(sendServerEmail).toHaveBeenCalled();
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it('should verify OTP successfully', async () => {
        // Mock stored OTP
        mockDoc.get.mockResolvedValue({
            exists: true,
            data: () => ({
                otp: '123456',
                expiresAt: { toMillis: () => Date.now() + 10000 }, // Future
            })
        });

        const req = createMockRequest({ email: 'test@example.com', otp: '123456', action: 'verify' });
        const res = await POST(req);
        const data = await res.json();

        expect(mockDoc.delete).toHaveBeenCalled();
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
