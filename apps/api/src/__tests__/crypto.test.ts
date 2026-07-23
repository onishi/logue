import { randomToken, sha256Base64Url } from "../crypto";

describe("randomToken", () => {
  it("generates URL-safe tokens that differ between calls", () => {
    const a = randomToken(16);
    const b = randomToken(16);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("sha256Base64Url", () => {
  it("is deterministic for the same input", async () => {
    const a = await sha256Base64Url("logue");
    const b = await sha256Base64Url("logue");
    expect(a).toBe(b);
  });

  it("produces different digests for different inputs", async () => {
    const a = await sha256Base64Url("logue-1");
    const b = await sha256Base64Url("logue-2");
    expect(a).not.toBe(b);
  });
});
