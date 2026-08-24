import { reputationService } from './reputation.service';

describe('Reputation Service - Ledger & Calculation', () => {

    describe('calculateDynamicPoints', () => {
        it('TC_VALUE_03: A job below ₹500 yields 0 base points and 0 bonus', () => {
            const result = reputationService.calculateDynamicPoints(499, 5);
            expect(result.points).toBe(0);
            expect(result.bonus).toBe(0);
            expect(result.reason).toContain('below minimum threshold');
        });

        it('TC_VALUE_01: A ₹1,000 job yields 21 base points', () => {
            const result = reputationService.calculateDynamicPoints(1000, undefined);
            expect(result.points).toBe(21);
            expect(result.bonus).toBe(0);
        });

        it('TC_VALUE_02: A ₹60,000 job yields 80 base points', () => {
            const result = reputationService.calculateDynamicPoints(60000, undefined);
            expect(result.points).toBe(80);
            expect(result.bonus).toBe(0);
        });

        it('TC_QUALITY_01: 5-Star gives 50% bonus on base', () => {
            const result = reputationService.calculateDynamicPoints(20000, 5);
            // 20 + 20000/1000 = 40 base. 50% of 40 = 20 bonus.
            expect(result.points).toBe(40);
            expect(result.bonus).toBe(20);
        });

        it('TC_QUALITY_02: 1-Star gives -100% bonus (wipes base)', () => {
            const result = reputationService.calculateDynamicPoints(20000, 1);
            // 40 base, -40 bonus.
            expect(result.points).toBe(40);
            expect(result.bonus).toBe(-40);
        });
    });

});
