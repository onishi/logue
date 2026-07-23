import { buildGoogleAuthorizationUrl } from "../google";

describe("buildGoogleAuthorizationUrl", () => {
  it("builds an authorization URL with the expected query params", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: "client-id",
        redirectUri: "http://localhost/api/auth/callback",
        state: "state-value",
        codeChallenge: "challenge-value",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost/api/auth/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});
