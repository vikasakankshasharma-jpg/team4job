
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(process.cwd(), 'tests/fixtures/audit-state.json');

export interface AuditState {
    jobId?: string;
    startOtp?: string;
    uniqueTitle?: string;
}

export class TestState {
    static save(state: Partial<AuditState>) {
        const current = this.load();
        const updated = { ...current, ...state };
        
        // Ensure directory exists
        const dir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(STATE_FILE, JSON.stringify(updated, null, 2));
        console.log(`[TestState] Saved: ${JSON.stringify(state)}`);
    }

    static load(): AuditState {
        if (!fs.existsSync(STATE_FILE)) return {};
        try {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        } catch (e) {
            console.error('[TestState] Failed to load state:', e);
            return {};
        }
    }

    static clear() {
        if (fs.existsSync(STATE_FILE)) {
            fs.unlinkSync(STATE_FILE);
            console.log('[TestState] State cleared.');
        }
    }
}
