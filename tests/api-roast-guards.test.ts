import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import roastHandler from "../api/roast.ts";
import { consumeDailyUsage } from "../api/_rateLimit.ts";
import { restoreEnv, snapshotEnv } from "./helpers/env.ts";
import { bearer, createSignedClerkToken, installMockClerkApi } from "./helpers/mockClerk.ts";
import { runApiHandler } from "./helpers/mockVercel.ts";

let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  process.env.CLERK_SECRET_KEY = "clerk_test_secret";
  process.env.PRO_TIER_ENABLED = "1";
  process.env.ROAST_V11_ENABLED = "0";
  delete process.env.GROQ_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("POST /api/roast returns 401 when user is not authenticated", async () => {
  const result = await runApiHandler(roastHandler, {
    method: "POST",
    body: { url: "https://example.com" }
  });

  assert.equal(result.statusCode, 401);
  assert.match(String((result.jsonBody as { message?: string }).message || ""), /login required/i);
});

test("POST /api/roast returns 403 for waitlist-pending users before roast execution", async () => {
  const userId = `waitlist_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "waitlist.user@example.com",
        publicMetadata: { proWaitlistStatus: "pending" }
      }
    }
  });

  try {
    const result = await runApiHandler(roastHandler, {
      method: "POST",
      headers: {
        authorization: bearer(signed.token)
      },
      body: {
        url: "https://example.com"
      }
    });

    assert.equal(result.statusCode, 403);
    assert.equal((result.jsonBody as { userStatus?: string }).userStatus, "waitlist");
  } finally {
    clerk.restore();
  }
});

test("POST /api/roast enforces 2/day limit for free users and returns 429 on third attempt", async () => {
  const userId = `free_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "free.user@example.com",
        publicMetadata: {}
      }
    }
  });

  try {
    await consumeDailyUsage("free", userId);
    await consumeDailyUsage("free", userId);

    const result = await runApiHandler(roastHandler, {
      method: "POST",
      headers: {
        authorization: bearer(signed.token)
      },
      body: {
        url: "https://example.com"
      }
    });

    assert.equal(result.statusCode, 429);
    assert.equal((result.jsonBody as { userStatus?: string }).userStatus, "free");
    assert.equal((result.jsonBody as { usedToday?: number }).usedToday, 2);
    assert.match(String((result.jsonBody as { message?: string }).message || ""), /join pro waitlist/i);
  } finally {
    clerk.restore();
  }
});

test("POST /api/roast rejects unsupported methods", async () => {
  const result = await runApiHandler(roastHandler, {
    method: "GET"
  });

  assert.equal(result.statusCode, 405);
});
