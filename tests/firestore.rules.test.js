import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-collins-lawncare';
let testEnvironment;

function validAppData(overrides = {}) {
  return {
    version: 2,
    employees: [],
    activeEmployeeId: null,
    jobs: [],
    workdays: {},
    prospects: [],
    expenses: [],
    settings: {},
    ...overrides,
  };
}

function appDocument(context, userId = 'alice') {
  return doc(context.firestore(), 'users', userId, 'data', 'app');
}

describe('Firestore security rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: await readFile('firestore.rules', 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('allows an authenticated owner to create, read, and update valid app data', async () => {
    const alice = testEnvironment.authenticatedContext('alice');
    const reference = appDocument(alice);

    await assertSucceeds(setDoc(reference, validAppData()));
    await assertSucceeds(getDoc(reference));
    await assertSucceeds(setDoc(reference, validAppData({ jobs: [{ id: 'job-1' }] })));
  });

  it('denies unauthenticated access', async () => {
    const anonymous = testEnvironment.unauthenticatedContext();

    await assertFails(getDoc(appDocument(anonymous)));
    await assertFails(setDoc(appDocument(anonymous), validAppData()));
  });

  it('prevents one authenticated user from accessing another owner document', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(appDocument(context), validAppData());
    });
    const bob = testEnvironment.authenticatedContext('bob');

    await assertFails(getDoc(appDocument(bob, 'alice')));
    await assertFails(setDoc(appDocument(bob, 'alice'), validAppData()));
  });

  it('rejects unknown fields, wrong types, and oversized collections', async () => {
    const alice = testEnvironment.authenticatedContext('alice');
    const reference = appDocument(alice);

    await assertFails(setDoc(reference, validAppData({ isAdmin: true })));
    await assertFails(setDoc(reference, validAppData({ jobs: {} })));
    await assertFails(setDoc(
      reference,
      validAppData({ jobs: Array.from({ length: 201 }, (_, id) => ({ id })) })
    ));
  });

  it('denies documents outside the single app document path', async () => {
    const alice = testEnvironment.authenticatedContext('alice');
    const other = doc(alice.firestore(), 'users', 'alice', 'data', 'other');

    await assertFails(setDoc(other, validAppData()));
  });
});
