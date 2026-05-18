import { CaseService } from '@/domains/cases/case.service';
import { caseRepository } from '@/domains/cases/case.repository';
import { platformEventEmitter } from '@/lib/events/event-emitter';
import { logAdminAction } from '@/lib/admin-logger';

jest.mock('@/domains/cases/case.repository');
jest.mock('@/lib/events/event-emitter');
jest.mock('@/lib/admin-logger');

describe('CaseService', () => {
  let caseService: CaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    caseService = new CaseService();
  });

  it('creates cases and emits events', async () => {
    const mockCaseId = 'test-case-123';
    (caseRepository.create as jest.Mock).mockResolvedValue(mockCaseId);

    const input = {
      type: 'dispute' as const,
      priority: 'high' as const,
      severity: 'medium' as const,
      slaDueAt: new Date(),
      linkedEntities: [],
      title: 'Dispute over pricing',
      description: 'The buyer refused to pay full price.'
    };

    const admin = { id: 'admin1', name: 'Alok', email: 'alok@team4job.com' };
    const id = await caseService.openCase(input, admin);

    expect(id).toBe(mockCaseId);
    expect(caseRepository.create).toHaveBeenCalledWith(input);
    expect(caseRepository.appendTimelineEntry).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalled();
    expect(platformEventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'case.opened' })
    );
  });

  it('updates case status and emits case.closed', async () => {
    const caseId = 'case-1';
    (caseRepository.fetchById as jest.Mock).mockResolvedValue({
      id: caseId,
      status: 'open',
      approvals: []
    });

    const actor = { id: 'admin1', name: 'Alok', email: 'alok@team4job.com', role: 'compliance_manager' as const };
    await caseService.updateCaseStatus(caseId, 'closed', actor, 'Dispute resolved via refund');

    expect(caseRepository.update).toHaveBeenCalledWith(caseId, expect.objectContaining({ status: 'closed' }));
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'CASE_CLOSED' }));
    expect(platformEventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'case.closed' })
    );
  });

  it('enforces separation-of-duties during approval process', async () => {
    const caseId = 'case-1';
    const approvalId = 'app-1';
    (caseRepository.fetchById as jest.Mock).mockResolvedValue({
      id: caseId,
      status: 'open',
      approvals: [
        {
          id: approvalId,
          requesterId: 'admin1',
          requesterName: 'Alok',
          reason: 'Request refund bypass',
          requestedAt: new Date()
        }
      ]
    });

    const actor = { id: 'admin1', name: 'Alok', email: 'alok@team4job.com', role: 'compliance_manager' as const };
    
    await expect(
      caseService.processApproval(caseId, approvalId, 'approved', actor)
    ).rejects.toThrow('Separation of Duties violated');
  });
});
