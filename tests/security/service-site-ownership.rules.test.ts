import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-service-site',
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

describe('Phase 4: Service Site Ownership Rules', () => {
  it('✅ Dealer can create a ServiceSite with their own dealerId', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertSucceeds(dealerA.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-A', name: 'Site 1' }));
  });

  it('❌ Dealer CANNOT spoof ownership when creating ServiceSite', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-B', name: 'Site 1' }));
  });

  it('❌ Dealer CANNOT transfer ownership (update dealerId) of ServiceSite', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-A', name: 'Site 1' });
    });

    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').update({ dealerId: 'dealer-B' }));
  });

  it('❌ Random user CANNOT read Dealer ServiceSite', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-A', name: 'Site 1' });
    });

    const random = testEnv.authenticatedContext('random-user');
    await assertFails(random.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').get());
  });
});
