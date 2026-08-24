import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-reputation-protection',
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

describe('Phase 4: Reputation Protection Rules', () => {
  it('❌ Installer CANNOT update their own points or tier', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('installer1').set({ 
        roles: ['Professional'], 
        points: 100,
        tier: 'Bronze' 
      });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertFails(installer.firestore().collection('users').doc('installer1').update({ points: 500 }));
    await assertFails(installer.firestore().collection('users').doc('installer1').update({ tier: 'Gold' }));
  });

  it('❌ Installer CANNOT update their own rating in professionalProfile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('installer1').set({ 
        roles: ['Professional'], 
        professionalProfile: { rating: 4.5, skills: ['CCTV'] }
      });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertFails(installer.firestore().collection('users').doc('installer1').update({ 
      'professionalProfile.rating': 5.0 
    }));
  });

  it('✅ Installer CAN update their allowed profile fields (about, skills)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('installer1').set({ 
        roles: ['Professional'], 
        about: 'Old about',
        professionalProfile: { rating: 4.5, skills: ['CCTV'] }
      });
    });

    const installer = testEnv.authenticatedContext('installer1');
    await assertSucceeds(installer.firestore().collection('users').doc('installer1').update({ about: 'New about' }));
    await assertSucceeds(installer.firestore().collection('users').doc('installer1').update({ 
      'professionalProfile.skills': ['CCTV', 'Alarm'] 
    }));
  });
});
