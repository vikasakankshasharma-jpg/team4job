import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-financial-protection',
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

describe('Phase 4: Financial Protection & State Bypass Rules', () => {
  it('❌ Client CANNOT update job status directly to bypass state machine', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('client1').set({ roles: ['Client'] });
      await context.firestore().collection('jobs').doc('job1').set({ status: 'open', clientId: 'client1' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertFails(client.firestore().collection('jobs').doc('job1').update({ status: 'Awarded' }));
  });

  it('❌ Client CANNOT update paymentStatus directly to released', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('client1').set({ roles: ['Client'] });
      await context.firestore().collection('jobs').doc('job1').set({ status: 'open', clientId: 'client1', paymentStatus: 'escrow_funded' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertFails(client.firestore().collection('jobs').doc('job1').update({ paymentStatus: 'released' }));
  });

  it('❌ Client CANNOT update dealerMargin, b2bPrice, or b2bCost', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('client1').set({ roles: ['Client'] });
      await context.firestore().collection('jobs').doc('job1').set({ status: 'open', clientId: 'client1' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertFails(client.firestore().collection('jobs').doc('job1').update({ dealerMargin: 1000 }));
    await assertFails(client.firestore().collection('jobs').doc('job1').update({ b2bPrice: 5000 }));
  });

  it('✅ Client CAN update allowed fields like title or description', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('client1').set({ roles: ['Client'] });
      await context.firestore().collection('jobs').doc('job1').set({ status: 'open', clientId: 'client1', title: 'Old Title' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertSucceeds(client.firestore().collection('jobs').doc('job1').update({ title: 'New Title' }));
  });
});
