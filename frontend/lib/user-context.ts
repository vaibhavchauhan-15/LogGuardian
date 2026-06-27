import {
  ACCESS_TOKEN_STORAGE_KEY,
  USER_EMAIL_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
} from "@/lib/api";

export type ResolvedUserContext = {
  userId: string;
  email: string | null;
  name: string;
};

type JwtClaims = {
  sub?: string;
  user_id?: string;
  email?: string;
  name?: string;
};

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? "=".repeat(4 - padding) : "");
    return window.atob(padded);
  } catch {
    return null;
  }
}

function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload) as JwtClaims;
  } catch {
    return null;
  }
}

function store(userId: string, email: string | null): ResolvedUserContext {
  const name = email ? email.split("@")[0] : "User";
  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  if (email) {
    window.localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
  }
  return { userId, email, name };
}

/**
 * Resolves the current user from locally-cached identity.
 *
 * Auth is handled by Firebase, which writes the user id / email / ID token to
 * localStorage on sign-in (see lib/firebase/auth.ts). This reads those values,
 * falling back to decoding the Firebase ID token if the id was cleared.
 */
export async function resolveAndStoreUserContext(): Promise<ResolvedUserContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const existingUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  const existingEmail = window.localStorage.getItem(USER_EMAIL_STORAGE_KEY);
  if (existingUserId) {
    return {
      userId: existingUserId,
      email: existingEmail,
      name: existingEmail?.split("@")[0] ?? "User",
    };
  }

  // Fallback: derive identity from the cached Firebase ID token (a JWT).
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (accessToken) {
    const claims = decodeJwtClaims(accessToken);
    const userId = (claims?.user_id || claims?.sub || "").trim();
    if (userId) {
      return store(userId, claims?.email?.trim() || null);
    }
  }

  // Local development convenience: synthesise a stable dev user so the app is
  // usable without signing in. Never runs in production builds.
  if (process.env.NODE_ENV !== "production") {
    const devUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim() || `lg-dev-${crypto.randomUUID()}`;
    const devEmail =
      window.localStorage.getItem(USER_EMAIL_STORAGE_KEY)?.trim() || `${devUserId}@logguardian.local`;
    return store(devUserId, devEmail);
  }

  return null;
}
