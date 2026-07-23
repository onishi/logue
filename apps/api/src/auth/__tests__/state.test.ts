import { decodeOAuthStateCookie, encodeOAuthStateCookie } from "../state";

describe("oauth state cookie", () => {
  it("round-trips state and code verifier", () => {
    const encoded = encodeOAuthStateCookie("state-value", "verifier-value");
    expect(decodeOAuthStateCookie(encoded)).toEqual({
      state: "state-value",
      codeVerifier: "verifier-value",
    });
  });

  it("returns null for missing or malformed cookies", () => {
    expect(decodeOAuthStateCookie(undefined)).toBeNull();
    expect(decodeOAuthStateCookie("")).toBeNull();
    expect(decodeOAuthStateCookie("no-separator")).toBeNull();
  });
});
