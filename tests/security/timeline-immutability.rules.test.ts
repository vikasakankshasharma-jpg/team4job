import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-timeline-immutability',
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

describe('Phase 4: Timeline Immutability Rules', () => {
  it('❌ Client CANNOT create a job_event timeline entry directly', async () => {
    const client = testEnv.authenticatedContext('client1');
    await assertFails(client.firestore().collection('job_events').doc('event1').set({ jobId: 'job1', eventType: 'FAKE_EVENT' }));
  });

  it('❌ Installer CANNOT update a job_event timeline entry', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('job_events').doc('event1').set({ jobId: 'job1', eventType: 'REAL_EVENT' });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertFails(installer.firestore().collection('job_events').doc('event1').update({ eventType: 'HACKED_EVENT' }));
  });

  it('❌ Client CANNOT delete a job_event timeline entry', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('job_events').doc('event1').set({ jobId: 'job1', eventType: 'REAL_EVENT' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertFails(client.firestore().collection('job_events').doc('event1').delete());
  });

  it('✅ Job participant CAN read timeline events', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job1').set({ clientId: 'client1', awardedProfessionalId: 'installer1' });
      await context.firestore().collection('job_events').doc('event1').set({ jobId: 'job1', eventType: 'REAL_EVENT' });
    });

    const client = testEnv.authenticatedContext('client1');
    await assertSucceeds(client.firestore().collection('job_events').doc('event1').get());

    const installer = testEnv.authenticatedContext('installer1');
    await assertSucceeds(installer.firestore().collection('job_events').doc('event1').get());
  });

  it('❌ Random user CANNOT read timeline events', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('jobs').doc('job1').set({ clientId: 'client1', awardedProfessionalId: 'installer1' });
      await context.firestore().collection('job_events').doc('event1').set({ jobId: 'job1', eventType: 'REAL_EVENT' });
    });

    const random = testEnv.authenticatedContext('random1');
    await assertFails(random.firestore().collection('job_events').doc('event1').get());
  });
});
