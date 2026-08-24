import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-dealer-isolation',
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

describe('Phase 4: Dealer Isolation Rules', () => {
  it('✅ Dealer A can read and write their own customers', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertSucceeds(dealerA.firestore().collection('dealers').doc('dealer-A').collection('customers').doc('cust1').set({ name: 'Cust 1' }));
    await assertSucceeds(dealerA.firestore().collection('dealers').doc('dealer-A').collection('customers').doc('cust1').get());
  });

  it('❌ Dealer A CANNOT read Dealer B customers', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-B').collection('customers').doc('cust1').get());
  });

  it('❌ Dealer A CANNOT write to Dealer B customers', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-B').collection('customers').doc('cust1').set({ name: 'Cust 1' }));
  });

  it('✅ Dealer A can create their own ServiceSite', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertSucceeds(dealerA.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-A', name: 'Site 1' }));
  });

  it('❌ Dealer A CANNOT create ServiceSite for themselves but spoof dealerId = dealer-B', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-A').collection('serviceSites').doc('site1').set({ dealerId: 'dealer-B', name: 'Site 1' }));
  });
  
  it('❌ Dealer A CANNOT read Dealer B ServiceSite', async () => {
    const dealerA = testEnv.authenticatedContext('dealer-A');
    await assertFails(dealerA.firestore().collection('dealers').doc('dealer-B').collection('serviceSites').doc('site1').get());
  });
});
