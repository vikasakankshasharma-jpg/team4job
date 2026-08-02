import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class CustomProgressReporter implements Reporter {
    private totalTests = 0;
    private completedTests = 0;
    private passed = 0;
    private failed = 0;
    private skipped = 0;
    private lastReportTime = Date.now();

    onBegin(config: any, suite: any) {
        this.totalTests = suite.allTests().length;
        console.log(`[CustomProgressReporter] Starting suite with ${this.totalTests} tests.`);
    }

    onTestEnd(test: TestCase, result: TestResult) {
        this.completedTests++;
        if (result.status === 'passed') this.passed++;
        else if (result.status === 'skipped') this.skipped++;
        else this.failed++;

        const now = Date.now();
        // Report every 1 minute or every 5 tests
        if (now - this.lastReportTime > 1 * 60 * 1000 || this.completedTests % 5 === 0 || this.completedTests === this.totalTests) {
            const percent = ((this.completedTests / this.totalTests) * 100).toFixed(1);
            console.log(`[CustomProgressReporter] Progress: ${this.completedTests}/${this.totalTests} (${percent}%) | Passed: ${this.passed} | Failed: ${this.failed} | Skipped: ${this.skipped}`);
            this.lastReportTime = now;
        }
    }

    onEnd(result: FullResult) {
        console.log(`[CustomProgressReporter] Finished suite. Status: ${result.status}`);
    }
}

export default CustomProgressReporter;
