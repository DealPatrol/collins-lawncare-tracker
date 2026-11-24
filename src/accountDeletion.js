// In-app account deletion (App Store Review Guideline 5.1.1(v)).
//
// Pure orchestration with injected dependencies so it is unit-testable
// without Firebase. AuthProvider wires the real Firebase calls.
//
// Order matters:
//   1. Make sure the sign-in is recent (Firebase refuses deleteUser otherwise).
//      If it isn't, ask for the password BEFORE touching any data, so a
//      cancelled re-auth never leaves a half-deleted account.
//   2. Delete the user's Firestore data (needs the user to still exist,
//      because the security rules check request.auth.uid).
//   3. Delete the Firebase Auth user.
//   4. Clear the local cache on this device.

export const RECENT_LOGIN_MS = 5 * 60 * 1000;

export const DELETE_STATUS = Object.freeze({
  DELETED: "deleted",
  NEEDS_PASSWORD: "needs-password",
});

export class AccountDeletionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AccountDeletionError";
    this.code = code;
  }
}

/** True when the last sign-in is older than Firebase's recent-login window. */
export function needsRecentLogin(authTime, now = Date.now()) {
  const t = typeof authTime === "string" ? Date.parse(authTime) : Number(authTime);
  if (!Number.isFinite(t)) return true;
  return now - t > RECENT_LOGIN_MS - 30 * 1000; // 30 s safety margin
}

export function friendlyDeletionError(code) {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "That password isn't right. Try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/network-request-failed":
    case "unavailable":
      return "No connection. Connect to the internet and try again.";
    case "permission-denied":
      return "Your cloud data couldn't be deleted (permission denied). Sign out and back in, then try again.";
    default:
      return "Your account couldn't be deleted. Please try again.";
  }
}

/**
 * @param {object} opts
 * @param {string} [opts.password]    Provided after a NEEDS_PASSWORD result.
 * @param {object} opts.deps
 *   getAuthTime(): Promise<string|number>   last sign-in time
 *   reauthenticate(password): Promise<void>
 *   deleteCloudData(): Promise<void>         idempotent
 *   deleteAuthUser(): Promise<void>
 *   clearLocal(): void | Promise<void>
 * @param {number} [opts.now]
 */
export async function deleteAccount({ password, deps, now = Date.now() }) {
  const wrap = (err) => {
    if (err instanceof AccountDeletionError) return err;
    return new AccountDeletionError(friendlyDeletionError(err?.code), err?.code);
  };

  try {
    if (password) {
      await deps.reauthenticate(password);
    } else {
      const authTime = await deps.getAuthTime();
      if (needsRecentLogin(authTime, now)) return { status: DELETE_STATUS.NEEDS_PASSWORD };
    }

    await deps.deleteCloudData();

    try {
      await deps.deleteAuthUser();
    } catch (err) {
      if (err?.code === "auth/requires-recent-login") {
        return { status: DELETE_STATUS.NEEDS_PASSWORD };
      }
      throw err;
    }

    await deps.clearLocal();
    return { status: DELETE_STATUS.DELETED };
  } catch (err) {
    if (err?.code === "auth/requires-recent-login") return { status: DELETE_STATUS.NEEDS_PASSWORD };
    throw wrap(err);
  }
}
