import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-installer-privacy',
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

describe('Phase 4: Installer Privacy Rules', () => {
  it('✅ Installer can read an OPEN job', async () => {
    // Setup job as admin
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-open').set({ status: 'open', clientId: 'client1' });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertSucceeds(installer.firestore().collection('jobs').doc('job-open').get());
  });

  it('❌ Unassigned Installer CANNOT read a job if status is not open', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-closed').set({ status: 'in_progress', clientId: 'client1', awardedProfessionalId: 'installer2' });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertFails(installer.firestore().collection('jobs').doc('job-closed').get());
  });

  it('✅ Assigned Installer CAN read a closed/in_progress job', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-assigned').set({ status: 'in_progress', clientId: 'client1', awardedProfessionalId: 'installer1' });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertSucceeds(installer.firestore().collection('jobs').doc('job-assigned').get());
  });

  it('❌ Installer (Not Awarded) CANNOT read exact address/margin from /private', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-open').set({ status: 'open', clientId: 'client1' });
      await context.firestore().collection('jobs').doc('job-open').collection('private').doc('details').set({ exactAddress: '123 Secret St', dealerMargin: 500 });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertFails(installer.firestore().collection('jobs').doc('job-open').collection('private').doc('details').get());
  });

  it('✅ Installer (Awarded) CAN read exact address from /private', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job-assigned').set({ status: 'in_progress', clientId: 'client1', awardedProfessionalId: 'installer1' });
      await context.firestore().collection('jobs').doc('job-assigned').collection('private').doc('details').set({ exactAddress: '123 Secret St' });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertSucceeds(installer.firestore().collection('jobs').doc('job-assigned').collection('private').doc('details').get());
  });
});
