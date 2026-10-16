// Run with: npx tsx src/lib/domains.test.ts
import assert from "node:assert/strict";
import { frameAncestors, isOriginAllowed, normalizeDomain } from "./domains";

assert.equal(normalizeDomain("https://www.Shop.com/about?x=1"), "www.shop.com");
assert.equal(normalizeDomain("  example.com. "), "example.com");
assert.equal(normalizeDomain("*.example.com"), "*.example.com");
assert.equal(normalizeDomain("localhost:8080"), "localhost:8080");
assert.equal(normalizeDomain("*"), null);
assert.equal(normalizeDomain("exa mple.com"), null);
assert.equal(normalizeDomain("javascript:alert(1)"), null);

const list = ["example.com", "*.shop.io", "localhost:8080"];
const cases: [string | null, boolean][] = [
  ["https://example.com", true],
  ["https://www.example.com", true],
  ["https://blog.example.com", false],
  ["https://evil-example.com", false],
  ["https://example.com.evil.net", false],
  ["https://shop.io", true],
  ["https://eu.shop.io", true],
  ["https://notshop.io", false],
  ["http://localhost:8080", true],
  ["http://localhost:3001", false],
  [null, false],
  ["null", false],
  ["http://localhost:3000", true], // APP_URL default
];
for (const [origin, expected] of cases) assert.equal(isOriginAllowed(origin, list), expected, String(origin));
assert.equal(isOriginAllowed("https://anything.com", []), true);
assert.equal(isOriginAllowed("https://shop.com", ["www.shop.com"]), true);
assert.equal(isOriginAllowed("https://www.shop.com", ["www.shop.com"]), true);
assert.equal(isOriginAllowed("https://blog.shop.com", ["www.shop.com"]), false);
assert.equal(isOriginAllowed("http://127.0.0.1:5500", ["127.0.0.1:5500"]), true);
assert.match(frameAncestors(["example.com"]), /^'self' https:\/\/example\.com http:\/\/example\.com https:\/\/www\.example\.com/);
console.log("domains: all tests passed");
