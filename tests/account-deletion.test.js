import { describe, expect, it, vi } from 'vitest';
import {
  AccountDeletionError, DELETE_STATUS, deleteAccount, needsRecentLogin, RECENT_LOGIN_MS,
} from '../src/accountDeletion.js';

const NOW = 1_800_000_000_000;

function makeDeps(overrides = {}) {
  const calls = [];
  const track = (name, impl) => vi.fn(async (...args) => { calls.push(name); return impl?.(...args); });
  return {
    calls,
    deps: {
      getAuthTime: track('getAuthTime', () => new Date(NOW - 60_000).toISOString()),
      reauthenticate: track('reauthenticate'),
      deleteCloudData: track('deleteCloudData'),
      deleteAuthUser: track('deleteAuthUser'),
      clearLocal: track('clearLocal'),
      ...overrides,
    },
  };
}

describe('needsRecentLogin', () => {
  it('accepts a sign-in from a minute ago', () => {
    expect(needsRecentLogin(new Date(NOW - 60_000).toISOString(), NOW)).toBe(false);
  });
  it('requires re-auth for an old or unknown sign-in', () => {
    expect(needsRecentLogin(new Date(NOW - RECENT_LOGIN_MS).toISOString(), NOW)).toBe(true);
    expect(needsRecentLogin(undefined, NOW)).toBe(true);
  });
});

describe('deleteAccount', () => {
  it('deletes cloud data, then the auth user, then local data', async () => {
    const { deps, calls } = makeDeps();
    await expect(deleteAccount({ deps, now: NOW })).resolves.toEqual({ status: DELETE_STATUS.DELETED });
    expect(calls).toEqual(['getAuthTime', 'deleteCloudData', 'deleteAuthUser', 'clearLocal']);
  });

  it('asks for the password before touching data when the sign-in is stale', async () => {
    const { deps, calls } = makeDeps({ getAuthTime: vi.fn(async () => new Date(NOW - 3_600_000).toISOString()) });
    await expect(deleteAccount({ deps, now: NOW })).resolves.toEqual({ status: DELETE_STATUS.NEEDS_PASSWORD });
    expect(calls).toEqual([]);
    expect(deps.deleteCloudData).not.toHaveBeenCalled();
  });

  it('re-authenticates with the password and completes deletion', async () => {
    const { deps, calls } = makeDeps();
    await expect(deleteAccount({ password: 'pw', deps, now: NOW })).resolves.toEqual({ status: DELETE_STATUS.DELETED });
    expect(deps.reauthenticate).toHaveBeenCalledWith('pw');
    expect(calls).toEqual(['reauthenticate', 'deleteCloudData', 'deleteAuthUser', 'clearLocal']);
  });

  it('falls back to a password prompt if Firebase still requires recent login', async () => {
    const err = Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' });
    const { deps } = makeDeps({ deleteAuthUser: vi.fn(async () => { throw err; }) });
    await expect(deleteAccount({ deps, now: NOW })).resolves.toEqual({ status: DELETE_STATUS.NEEDS_PASSWORD });
    expect(deps.clearLocal).not.toHaveBeenCalled();
  });

  it('surfaces a friendly error for a wrong password and deletes nothing', async () => {
    const err = Object.assign(new Error('bad'), { code: 'auth/wrong-password' });
    const { deps } = makeDeps({ reauthenticate: vi.fn(async () => { throw err; }) });
    const result = deleteAccount({ password: 'nope', deps, now: NOW });
    await expect(result).rejects.toBeInstanceOf(AccountDeletionError);
    await expect(deleteAccount({ password: 'nope', deps, now: NOW })).rejects.toThrow("That password isn't right");
    expect(deps.deleteCloudData).not.toHaveBeenCalled();
  });

  it('does not delete the auth user if cloud data deletion fails', async () => {
    const err = Object.assign(new Error('denied'), { code: 'permission-denied' });
    const { deps } = makeDeps({ deleteCloudData: vi.fn(async () => { throw err; }) });
    await expect(deleteAccount({ deps, now: NOW })).rejects.toThrow(/permission denied/);
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
    expect(deps.clearLocal).not.toHaveBeenCalled();
  });
});
