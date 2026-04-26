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
  email?: string;
  name?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

type SupabaseUserResponse = {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUserId(rawId?: string): string | null {
  const trimmed = rawId?.trim();
  if (!trimmed) {
    return null;
  }

  if (UUID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("lg-dev-")) {
    const possibleUuid = trimmed.slice("lg-dev-".length);
    if (UUID_PATTERN.test(possibleUuid)) {
      return possibleUuid;
    }
  }

  return null;
}

function getTokenFromParams(params: URLSearchParams): string | null {
  const token = params.get("access_token")?.trim() || params.get("id_token")?.trim();
  return token || null;
}

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

function normalizeUserContext(user: {
  id?: string;
  email?: string | null;
  fullName?: string;
  fallbackName?: string;
}): ResolvedUserContext | null {
  const userId = normalizeUserId(user.id);
  if (!userId) {
    return null;
  }

  const email = user.email?.trim() || null;
  const name =
    user.fullName?.trim() ||
    user.fallbackName?.trim() ||
    (email ? email.split("@")[0] : "User");

  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  if (email) {
    window.localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
  }

  return {
    userId,
    email,
    name,
  };
}

async function fetchSupabaseUser(
  supabaseUrl: string,
  accessToken?: string
): Promise<SupabaseUserResponse | null> {
  const headers: HeadersInit = {};
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    headers.apikey = anonKey;
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers,
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SupabaseUserResponse;
  } catch {
    return null;
  }
}

function syncAccessTokenFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hashValue = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hashValue);
  const searchParams = new URLSearchParams(window.location.search);

  const tokenFromHash = getTokenFromParams(hashParams);
  const tokenFromSearch = getTokenFromParams(searchParams);
  const token = tokenFromHash ?? tokenFromSearch;

  if (!token) {
    return null;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);

  if (tokenFromSearch) {
    [
      "access_token",
      "id_token",
      "refresh_token",
      "token_type",
      "expires_in",
      "expires_at",
      "provider_token",
      "provider_refresh_token",
    ].forEach((key) => searchParams.delete(key));
  }

  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
  window.history.replaceState(null, "", nextUrl);

  return token;
}

export async function resolveAndStoreUserContext(): Promise<ResolvedUserContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const existingUserId = normalizeUserId(window.localStorage.getItem(USER_ID_STORAGE_KEY) ?? undefined);
  const existingEmail = window.localStorage.getItem(USER_EMAIL_STORAGE_KEY);
  if (existingUserId) {
    window.localStorage.setItem(USER_ID_STORAGE_KEY, existingUserId);
    return {
      userId: existingUserId,
      email: existingEmail,
      name: existingEmail?.split("@")[0] ?? "User",
    };
  }

  const tokenFromUrl = syncAccessTokenFromUrl();
  const accessToken = tokenFromUrl ?? window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (accessToken) {
    const claims = decodeJwtClaims(accessToken);
    const claimContext = normalizeUserContext({
      id: claims?.sub,
      email: claims?.email || null,
      fullName: claims?.user_metadata?.full_name,
      fallbackName: claims?.user_metadata?.name || claims?.name,
    });
    if (claimContext) {
      return claimContext;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    return null;
  }

  const userFromToken = await fetchSupabaseUser(supabaseUrl, accessToken ?? undefined);
  const userFromCookie = userFromToken ?? (await fetchSupabaseUser(supabaseUrl));

  const resolved = normalizeUserContext({
    id: userFromCookie?.id,
    email: userFromCookie?.email || null,
    fullName: userFromCookie?.user_metadata?.full_name,
    fallbackName: userFromCookie?.user_metadata?.name,
  });

  if (resolved) {
    return resolved;
  }

  if (process.env.NODE_ENV !== "production") {
    const existingDevId = normalizeUserId(window.localStorage.getItem(USER_ID_STORAGE_KEY) ?? undefined);
    const devUserId = existingDevId || crypto.randomUUID();
    const devEmail = window.localStorage.getItem(USER_EMAIL_STORAGE_KEY)?.trim() || `${devUserId}@logguardian.local`;
    window.localStorage.setItem(USER_ID_STORAGE_KEY, devUserId);
    window.localStorage.setItem(USER_EMAIL_STORAGE_KEY, devEmail);

    return {
      userId: devUserId,
      email: devEmail,
      name: "Developer",
    };
  }

  return null;
}
