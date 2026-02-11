import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAndValidateUrl } from "../api/_utils.ts";

test("parseAndValidateUrl auto-prefixes https for bare domains", () => {
  const normalized = parseAndValidateUrl("example.com");
  assert.equal(normalized, "https://example.com/");
});

test("parseAndValidateUrl rejects localhost and private ranges", () => {
  assert.throws(() => parseAndValidateUrl("http://localhost:3000"), /valid domain|blocked/i);
  assert.throws(() => parseAndValidateUrl("http://127.0.0.1"), /valid domain|blocked/i);
  assert.throws(() => parseAndValidateUrl("http://192.168.1.10"), /blocked/i);
});

test("parseAndValidateUrl rejects blocked/adult-like domains", () => {
  assert.throws(() => parseAndValidateUrl("https://my-porn-site.example"), /blocked/i);
});

test("parseAndValidateUrl rejects malformed URLs", () => {
  assert.throws(() => parseAndValidateUrl("not a url"), /valid url/i);
});
