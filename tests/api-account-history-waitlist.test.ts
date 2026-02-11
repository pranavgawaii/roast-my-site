import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import accountHandler from "../api/account.ts";
import historyHandler from "../api/history.ts";
import proWaitlistHandler from "../api/pro-waitlist.ts";
import { restoreEnv, snapshotEnv } from "./helpers/env.ts";
import { bearer, createSignedClerkToken, installMockClerkApi } from "./helpers/mockClerk.ts";
import { runApiHandler } from "./helpers/mockVercel.ts";

let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  process.env.CLERK_SECRET_KEY = "clerk_test_secret";
  process.env.PRO_TIER_ENABLED = "1";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("GET /api/account returns 401 when not authenticated", async () => {
  const result = await runApiHandler(accountHandler, { method: "GET" });
  assert.equal(result.statusCode, 401);
});

test("GET /api/history returns 401 when not authenticated", async () => {
  const result = await runApiHandler(historyHandler, { method: "GET" });
  assert.equal(result.statusCode, 401);
});

test("GET /api/account returns free tier usage snapshot for authenticated user", async () => {
  const userId = `acct_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "account.user@example.com",
        publicMetadata: {}
      }
    }
  });

  try {
    const result = await runApiHandler(accountHandler, {
      method: "GET",
      headers: {
        authorization: bearer(signed.token)
      }
    });

    assert.equal(result.statusCode, 200);
    assert.equal((result.jsonBody as { userStatus?: string }).userStatus, "free");
    assert.equal((result.jsonBody as { dailyLimit?: number }).dailyLimit, 2);
    assert.equal((result.jsonBody as { usedToday?: number }).usedToday, 0);
  } finally {
    clerk.restore();
  }
});

test("POST /api/pro-waitlist stores pending request in Clerk metadata", async () => {
  const userId = `wait_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "waitlist.user@example.com",
        publicMetadata: {}
      }
    }
  });

  try {
    const result = await runApiHandler(proWaitlistHandler, {
      method: "POST",
      headers: {
        authorization: bearer(signed.token)
      }
    });

    assert.equal(result.statusCode, 200);
    assert.equal((result.jsonBody as { waitlistStatus?: string }).waitlistStatus, "pending");
    assert.equal(clerk.patchCalls.length, 1);
    assert.equal(clerk.patchCalls[0].userId, userId);
    assert.equal(clerk.patchCalls[0].patch.proWaitlistStatus, "pending");
  } finally {
    clerk.restore();
  }
});

test("POST /api/pro-waitlist is idempotent for already pending users", async () => {
  const userId = `pending_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "pending.user@example.com",
        publicMetadata: { proWaitlistStatus: "pending" }
      }
    }
  });

  try {
    const result = await runApiHandler(proWaitlistHandler, {
      method: "POST",
      headers: {
        authorization: bearer(signed.token)
      }
    });

    assert.equal(result.statusCode, 200);
    assert.equal((result.jsonBody as { waitlistStatus?: string }).waitlistStatus, "pending");
    assert.equal(clerk.patchCalls.length, 0);
    assert.match(
      String((result.jsonBody as { message?: string }).message || ""),
      /already pending/i
    );
  } finally {
    clerk.restore();
  }
});
