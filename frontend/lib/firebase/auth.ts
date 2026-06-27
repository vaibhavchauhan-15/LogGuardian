import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  ACTIVE_DASHBOARD_STORAGE_KEY,
  USER_EMAIL_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  clearApiCache,
} from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase/client";

export type FirebaseUserContext = {
  userId: string;
  email: string | null;
  name: string;
};

function persistUser(user: User, token: string): FirebaseUserContext {
  const email = user.email;
  const name = user.displayName?.trim() || (email ? email.split("@")[0] : "User");
  window.localStorage.setItem(USER_ID_STORAGE_KEY, user.uid);
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  if (email) window.localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
  return { userId: user.uid, email, name };
}

/**
 * Signs in with Google. Tries popup first; if the browser blocks it,
 * falls back to a full-page redirect automatically.
 */
export async function signInWithGoogle(): Promise<FirebaseUserContext | "redirecting"> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return persistUser(result.user, token);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";

    // Popup was blocked by the browser — fall back to redirect.
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return "redirecting";
    }

    // User closed the popup themselves — treat as a no-op.
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return "redirecting"; // reuse sentinel so caller just resets spinner
    }

    throw err;
  }
}

/**
 * Call once on the sign-in page mount to pick up the result of a
 * redirect-based sign-in (the fallback path above).
 * Returns the user context if returning from a redirect, null otherwise.
 */
export async function handleGoogleRedirectResult(): Promise<FirebaseUserContext | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const token = await result.user.getIdToken();
    return persistUser(result.user, token);
  } catch {
    // Redirect result errors (e.g. extension interference) are non-fatal on page load.
    return null;
  }
}

/** Signs the user out of Firebase and clears all locally-cached identity. */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // Continue clearing local state even if the remote sign-out fails.
  }

  clearApiCache();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_DASHBOARD_STORAGE_KEY);
  }
}
