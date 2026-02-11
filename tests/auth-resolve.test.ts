import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  deriveUserStatusFromMetadata,
  isAdminEmail,
  resolveAuthContext
} from "../api/_auth.ts";
import { restoreEnv, snapshotEnv } from "./helpers/env.ts";
import { bearer, createSignedClerkToken, installMockClerkApi } from "./helpers/mockClerk.ts";

let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  process.env.CLERK_SECRET_KEY = "clerk_test_secret";
  delete process.env.CLERK_JWT_ISSUER;
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("deriveUserStatusFromMetadata resolves free/waitlist/pro correctly", () => {
  const free = deriveUserStatusFromMetadata({});
  const waitlist = deriveUserStatusFromMetadata({ proWaitlistStatus: "pending" });
  const proByFlag = deriveUserStatusFromMetadata({ proApproved: true });
  const proByStatus = deriveUserStatusFromMetadata({ proWaitlistStatus: "approved" });

  assert.equal(free.userStatus, "free");
  assert.equal(waitlist.userStatus, "waitlist");
  assert.equal(proByFlag.userStatus, "pro");
  assert.equal(proByStatus.userStatus, "pro");
});

test("resolveAuthContext returns anonymous without bearer token", async () => {
  const auth = await resolveAuthContext({
    headers: {}
  } as never);

  assert.equal(auth.isAuthenticated, false);
  assert.equal(auth.userStatus, "anonymous");
  assert.equal(auth.user, null);
});

test("resolveAuthContext authenticates signed user token", async () => {
  const userId = `user_${Date.now()}`;
  const signed = createSignedClerkToken({ userId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [userId]: {
        id: userId,
        email: "qa.user@example.com",
        username: "qauser",
        publicMetadata: {}
      }
    }
  });

  try {
    const auth = await resolveAuthContext({
      headers: {
        authorization: bearer(signed.token)
      }
    } as never);

    assert.equal(auth.isAuthenticated, true);
    assert.equal(auth.userId, userId);
    assert.equal(auth.userStatus, "free");
    assert.equal(auth.waitlistStatus, "none");
    assert.equal(auth.user?.email, "qa.user@example.com");
  } finally {
    clerk.restore();
  }
});

test("admin email is automatically elevated to pro", async () => {
  const adminId = `admin_${Date.now()}`;
  const signed = createSignedClerkToken({ userId: adminId });
  const clerk = installMockClerkApi({
    jwk: signed.jwk,
    users: {
      [adminId]: {
        id: adminId,
        email: "pranvgg@gmail.com",
        username: "admin",
        publicMetadata: { proWaitlistStatus: "pending", proApproved: false }
      }
    }
  });

  try {
    const auth = await resolveAuthContext({
      headers: {
        authorization: bearer(signed.token)
      }
    } as never);

    assert.equal(isAdminEmail("pranvgg@gmail.com"), true);
    assert.equal(auth.isAuthenticated, true);
    assert.equal(auth.userStatus, "pro");
    assert.equal(auth.waitlistStatus, "approved");
    assert.equal(auth.proApproved, true);
  } finally {
    clerk.restore();
  }
});
