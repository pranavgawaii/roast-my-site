import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  consumeDailyUsage,
  currentIstDateKey,
  getDailyLimit
} from "../api/_rateLimit.ts";
import { restoreEnv, snapshotEnv } from "./helpers/env.ts";

let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  restoreEnv(envSnapshot);
});

test("daily limits match product policy", () => {
  assert.equal(getDailyLimit("anonymous"), 0);
  assert.equal(getDailyLimit("free"), 2);
  assert.equal(getDailyLimit("waitlist"), 0);
  assert.equal(getDailyLimit("pro"), null);
});

test("free user can consume two roasts and third is blocked", async () => {
  const userId = `free_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const first = await consumeDailyUsage("free", userId);
  const second = await consumeDailyUsage("free", userId);
  const third = await consumeDailyUsage("free", userId);

  assert.equal(first.allowed, true);
  assert.equal(first.usedToday, 1);
  assert.equal(first.remaining, 1);

  assert.equal(second.allowed, true);
  assert.equal(second.usedToday, 2);
  assert.equal(second.remaining, 0);

  assert.equal(third.allowed, false);
  assert.equal(third.reason, "daily_limit_reached");
  assert.equal(third.usedToday, 2);
});

test("waitlist user is always blocked", async () => {
  const decision = await consumeDailyUsage("waitlist", `wait_${Date.now()}`);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "waitlist_pending");
  assert.equal(decision.remaining, 0);
});

test("pro user remains allowed (unlimited)", async () => {
  const id = `pro_${Date.now()}`;
  const first = await consumeDailyUsage("pro", id);
  const second = await consumeDailyUsage("pro", id);
  const third = await consumeDailyUsage("pro", id);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(first.dailyLimit, null);
  assert.equal(second.dailyLimit, null);
});

test("IST date key changes at midnight IST boundary", () => {
  const justBeforeMidnightIst = new Date("2026-02-11T18:29:59.000Z"); // 23:59:59 IST
  const justAfterMidnightIst = new Date("2026-02-11T18:30:01.000Z"); // 00:00:01 IST next day

  const beforeKey = currentIstDateKey(justBeforeMidnightIst);
  const afterKey = currentIstDateKey(justAfterMidnightIst);

  assert.notEqual(beforeKey, afterKey);
  assert.equal(beforeKey, "20260211");
  assert.equal(afterKey, "20260212");
});
