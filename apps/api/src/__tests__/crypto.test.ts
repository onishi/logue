import { decryptSecret, encryptSecret, randomToken, sha256Base64Url } from "../crypto";

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

describe("encryptSecret / decryptSecret", () => {
  const secret = "test-session-secret";

  it("round-trips a plaintext value", async () => {
    const encrypted = await encryptSecret("my-refresh-token", secret);
    const decrypted = await decryptSecret(encrypted, secret);
    expect(decrypted).toBe("my-refresh-token");
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const a = await encryptSecret("same-value", secret);
    const b = await encryptSecret("same-value", secret);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong session secret", async () => {
    const encrypted = await encryptSecret("my-refresh-token", secret);
    await expect(decryptSecret(encrypted, "different-secret")).rejects.toThrow();
  });

  it("rejects a malformed encrypted value", async () => {
    await expect(decryptSecret("not-a-valid-payload", secret)).rejects.toThrow(
      "不正な暗号化データ形式です",
    );
  });
});
