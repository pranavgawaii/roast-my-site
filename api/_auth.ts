import type { VercelRequest } from "@vercel/node";
import { webcrypto } from "node:crypto";

const CLERK_API_BASE = "https://api.clerk.com/v1";
const TOKEN_CLOCK_SKEW_SECONDS = 60;
const JWKS_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ADMIN_EMAILS = ["pranvgg@gmail", "pranvgg@gmail.com"];

export type UserStatus = "anonymous" | "free" | "waitlist" | "pro";
export type WaitlistStatus = "none" | "pending" | "approved" | "denied";

interface TokenHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

interface TokenClaims {
  iss?: string;
  sub?: string;
  sid?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
}

interface ClerkUser {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at?: number;
  last_sign_in_at?: number | null;
  email_addresses?: Array<{ email_address?: string }>;
  public_metadata?: Record<string, unknown>;
}

interface Jwk {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

interface ResolvedJwks {
  keys: Jwk[];
}

export interface ResolvedAuthContext {
  isAuthenticated: boolean;
  userId?: string;
  sessionId?: string;
  userStatus: UserStatus;
  waitlistStatus: WaitlistStatus;
  proApproved: boolean;
  token?: string;
  publicMetadata: Record<string, unknown>;
  user: {
    id: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
  } | null;
}

export interface ClerkUserSummary {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  publicMetadata: Record<string, unknown>;
  createdAt?: number;
  lastSignInAt?: number | null;
}

let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? "=".repeat(4 - pad) : "");
  return Buffer.from(padded, "base64");
}

function parseToken(token: string) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  try {
    const header = JSON.parse(decodeBase64Url(headerPart).toString("utf8")) as TokenHeader;
    const claims = JSON.parse(decodeBase64Url(payloadPart).toString("utf8")) as TokenClaims;
    return { header, claims, signingInput: `${headerPart}.${payloadPart}`, signaturePart };
  } catch {
    return null;
  }
}

function toWaitlistStatus(value: unknown): WaitlistStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending" || normalized === "approved" || normalized === "denied") {
    return normalized;
  }
  return "none";
}

function toBoolean(value: unknown) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase();
}

function getAdminEmailSet() {
  const custom = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_ADMIN_EMAILS, ...custom]);
}

function getClerkSecretKey() {
  return process.env.CLERK_SECRET_KEY?.trim();
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }
  return getAdminEmailSet().has(normalizeEmail(email));
}

export function deriveUserStatusFromMetadata(metadata: Record<string, unknown>) {
  const waitlistStatus = toWaitlistStatus(metadata.proWaitlistStatus);
  const proApproved = toBoolean(metadata.proApproved) || waitlistStatus === "approved";
  const userStatus: UserStatus = proApproved
    ? "pro"
    : waitlistStatus === "pending"
      ? "waitlist"
      : "free";

  return {
    userStatus,
    waitlistStatus,
    proApproved
  };
}

export function isAdminAuth(auth: ResolvedAuthContext) {
  if (!auth.isAuthenticated) {
    return false;
  }
  return isAdminEmail(auth.user?.email);
}

async function fetchJwks(secretKey: string, force = false) {
  if (!force && jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.keys;
  }

  const tryFetch = async (withAuth: boolean) => {
    const response = await fetch(`${CLERK_API_BASE}/jwks`, {
      method: "GET",
      headers: withAuth ? { Authorization: `Bearer ${secretKey}` } : undefined
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ResolvedJwks;
    if (!payload?.keys || !Array.isArray(payload.keys)) {
      return null;
    }

    return payload.keys;
  };

  const keys = (await tryFetch(true)) || (await tryFetch(false));
  if (!keys) {
    throw new Error("Failed to resolve Clerk JWKS.");
  }

  jwksCache = {
    keys,
    expiresAt: Date.now() + JWKS_TTL_MS
  };

  return keys;
}

async function verifyTokenWithJwks(token: string, secretKey: string) {
  const parsed = parseToken(token);
  if (!parsed) {
    return null;
  }

  if (parsed.header.alg !== "RS256" || !parsed.header.kid) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.claims.exp && nowSeconds > parsed.claims.exp + TOKEN_CLOCK_SKEW_SECONDS) {
    return null;
  }
  if (parsed.claims.nbf && nowSeconds + TOKEN_CLOCK_SKEW_SECONDS < parsed.claims.nbf) {
    return null;
  }

  const expectedIssuer = process.env.CLERK_JWT_ISSUER?.trim();
  if (expectedIssuer && parsed.claims.iss && parsed.claims.iss !== expectedIssuer) {
    return null;
  }

  const jwks = await fetchJwks(secretKey);
  let key = jwks.find((entry) => entry.kid === parsed.header.kid);

  if (!key) {
    const refreshed = await fetchJwks(secretKey, true);
    key = refreshed.find((entry) => entry.kid === parsed.header.kid);
  }

  if (!key) {
    return null;
  }

  const cryptoKey = await webcrypto.subtle.importKey(
    "jwk",
    {
      kty: key.kty,
      use: key.use,
      alg: key.alg,
      n: key.n,
      e: key.e
    },
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const valid = await webcrypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(parsed.signaturePart),
    new TextEncoder().encode(parsed.signingInput)
  );

  return valid ? parsed.claims : null;
}

async function fetchClerkUser(userId: string, secretKey: string) {
  const response = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ClerkUser;
  if (!payload?.id) {
    return null;
  }

  return {
    id: payload.id,
    username: payload.username || null,
    firstName: payload.first_name || null,
    lastName: payload.last_name || null,
    email: payload.email_addresses?.[0]?.email_address,
    publicMetadata: payload.public_metadata || {},
    createdAt: payload.created_at,
    lastSignInAt: payload.last_sign_in_at
  };
}

export async function getClerkUser(userId: string) {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required to fetch user.");
  }
  return fetchClerkUser(userId, secretKey);
}

export async function listClerkUsers(args?: { limit?: number; maxPages?: number }) {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required to list users.");
  }

  const pageSize = Math.max(1, Math.min(100, args?.limit || 100));
  const maxPages = Math.max(1, Math.min(20, args?.maxPages || 5));
  const users: ClerkUserSummary[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const url = new URL(`${CLERK_API_BASE}/users`);
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to list Clerk users (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as
      | ClerkUser[]
      | { data?: ClerkUser[] };
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    users.push(
      ...rows
        .filter((row) => row && row.id)
        .map((row) => ({
          id: row.id,
          username: row.username || null,
          firstName: row.first_name || null,
          lastName: row.last_name || null,
          email: row.email_addresses?.[0]?.email_address,
          publicMetadata: row.public_metadata || {},
          createdAt: row.created_at,
          lastSignInAt: row.last_sign_in_at
        }))
    );

    if (rows.length < pageSize) {
      break;
    }
  }

  return users;
}

export function getBearerToken(req: VercelRequest) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function resolveAuthContext(req: VercelRequest): Promise<ResolvedAuthContext> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      isAuthenticated: false,
      userStatus: "anonymous",
      waitlistStatus: "none",
      proApproved: false,
      publicMetadata: {},
      user: null
    };
  }

  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    console.warn("CLERK_SECRET_KEY missing. Falling back to anonymous status.");
    return {
      isAuthenticated: false,
      userStatus: "anonymous",
      waitlistStatus: "none",
      proApproved: false,
      token,
      publicMetadata: {},
      user: null
    };
  }

  try {
    const claims = await verifyTokenWithJwks(token, secretKey);
    if (!claims?.sub) {
      return {
        isAuthenticated: false,
        userStatus: "anonymous",
        waitlistStatus: "none",
        proApproved: false,
        token,
        publicMetadata: {},
        user: null
      };
    }

    const user = await fetchClerkUser(claims.sub, secretKey);
    if (!user) {
      return {
        isAuthenticated: false,
        userStatus: "anonymous",
        waitlistStatus: "none",
        proApproved: false,
        token,
        publicMetadata: {},
        user: null
      };
    }

    const baseStatus = deriveUserStatusFromMetadata(user.publicMetadata);
    const adminEmail = user.email || null;
    const isAdmin = isAdminEmail(adminEmail);
    const userStatus = isAdmin ? "pro" : baseStatus.userStatus;
    const waitlistStatus = isAdmin ? "approved" : baseStatus.waitlistStatus;
    const proApproved = isAdmin ? true : baseStatus.proApproved;

    return {
      isAuthenticated: true,
      userId: user.id,
      sessionId: claims.sid,
      userStatus,
      waitlistStatus,
      proApproved,
      token,
      publicMetadata: user.publicMetadata,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    };
  } catch (err) {
    console.warn("Failed to resolve Clerk auth context:", err);
    return {
      isAuthenticated: false,
      userStatus: "anonymous",
      waitlistStatus: "none",
      proApproved: false,
      token,
      publicMetadata: {},
      user: null
    };
  }
}

export async function updateUserPublicMetadata(args: {
  userId: string;
  patch: Record<string, unknown>;
  existing?: Record<string, unknown>;
}) {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for metadata updates.");
  }

  const merged = {
    ...(args.existing || {}),
    ...args.patch
  };

  const response = await fetch(`${CLERK_API_BASE}/users/${args.userId}/metadata`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      public_metadata: merged
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to update Clerk metadata (${response.status}): ${body}`);
  }

  return merged;
}
