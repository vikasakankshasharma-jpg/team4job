import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-customer-isolation',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Phase 4: Customer Isolation Rules', () => {
  it('❌ Customer CANNOT read another customer\'s job', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-custB').set({ status: 'in_progress', clientId: 'custB' });
    });

    const custA = testEnv.authenticatedContext('custA');
    await assertFails(custA.firestore().collection('jobs').doc('job-custB').get());
  });

  it('✅ Customer CAN read their own job', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-custA').set({ status: 'in_progress', clientId: 'custA' });
    });

    const custA = testEnv.authenticatedContext('custA');
    await assertSucceeds(custA.firestore().collection('jobs').doc('job-custA').get());
  });

  it('❌ Customer CANNOT read Dealer private history/memory', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('dealers').doc('dealer1').collection('operationalMemory').doc('installer1').set({ note: 'secret' });
    });

    const custA = testEnv.authenticatedContext('custA');
    await assertFails(custA.firestore().collection('dealers').doc('dealer1').collection('operationalMemory').doc('installer1').get());
  });
});
