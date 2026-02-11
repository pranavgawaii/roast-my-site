import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";

export interface MockClerkUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  publicMetadata?: Record<string, unknown>;
}

interface SignedTokenArgs {
  userId: string;
  sessionId?: string;
  issuer?: string;
  expiresInSeconds?: number;
}

interface ClerkMockArgs {
  jwk: JsonWebKey & { kid: string };
  users: Record<string, MockClerkUser>;
}

function toBase64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createSignedClerkToken(args: SignedTokenArgs) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const kid = `kid_${randomUUID()}`;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: args.userId,
    sid: args.sessionId || `sess_${randomUUID()}`,
    iat: now,
    nbf: now - 5,
    exp: now + (args.expiresInSeconds || 3600),
    iss: args.issuer || "https://clerk.mock.local"
  };
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid
  };

  const signingInput = `${toBase64UrlJson(header)}.${toBase64UrlJson(payload)}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(privateKey)
    .toString("base64url");

  const exported = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const jwk = {
    ...exported,
    kid,
    alg: "RS256",
    use: "sig"
  } as JsonWebKey & { kid: string };

  return {
    token: `${signingInput}.${signature}`,
    jwk,
    payload
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

export function installMockClerkApi(args: ClerkMockArgs) {
  const originalFetch = global.fetch;
  const patchCalls: Array<{ userId: string; patch: Record<string, unknown> }> = [];

  global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (rawUrl === "https://api.clerk.com/v1/jwks") {
      return jsonResponse(200, { keys: [args.jwk] });
    }

    const userMatch = rawUrl.match(/^https:\/\/api\.clerk\.com\/v1\/users\/([^/]+)(\/metadata)?$/);
    if (userMatch) {
      const userId = decodeURIComponent(userMatch[1]);
      const isMetadataPatch = Boolean(userMatch[2]);
      const user = args.users[userId];

      if (!user) {
        return jsonResponse(404, { errors: [{ message: "User not found" }] });
      }

      if (isMetadataPatch) {
        const parsedBody =
          init?.body && typeof init.body === "string"
            ? (JSON.parse(init.body) as { public_metadata?: Record<string, unknown> })
            : { public_metadata: {} };
        const patch = parsedBody.public_metadata || {};

        user.publicMetadata = {
          ...(user.publicMetadata || {}),
          ...patch
        };

        patchCalls.push({
          userId,
          patch
        });

        return jsonResponse(200, { success: true });
      }

      return jsonResponse(200, {
        id: user.id,
        username: user.username || null,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        email_addresses: [{ email_address: user.email }],
        public_metadata: user.publicMetadata || {},
        created_at: Date.now(),
        last_sign_in_at: Date.now()
      });
    }

    throw new Error(`Unexpected fetch in test: ${rawUrl}`);
  };

  return {
    patchCalls,
    restore() {
      global.fetch = originalFetch;
    }
  };
}

export function bearer(token: string) {
  return `Bearer ${token}`;
}
