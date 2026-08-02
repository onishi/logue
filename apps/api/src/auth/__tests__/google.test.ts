import {
  buildGoogleAuthorizationUrl,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "../google";

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
    expect(url.searchParams.get("access_type")).toBe("online");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("allows overriding scope/accessType/prompt for incremental authorization", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: "client-id",
        redirectUri: "http://localhost/api/sheets/callback",
        state: "state-value",
        codeChallenge: "challenge-value",
        scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
        accessType: "offline",
        prompt: "consent",
      }),
    );

    expect(url.searchParams.get("scope")).toBe(
      "openid email profile https://www.googleapis.com/auth/spreadsheets",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });
});

describe("refreshGoogleAccessToken", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts a refresh_token grant and returns the new access token", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new-access-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await refreshGoogleAccessToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
    });

    expect(result).toEqual({ access_token: "new-access-token", expires_in: 3600 });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init?.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-token");
  });

  it("throws when Google returns an error response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("invalid_grant", { status: 400 }));

    await expect(
      refreshGoogleAccessToken({
        clientId: "client-id",
        clientSecret: "client-secret",
        refreshToken: "expired-token",
      }),
    ).rejects.toThrow("Google アクセストークンの更新に失敗しました");
  });
});

describe("revokeGoogleToken", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts the token to Google's revoke endpoint", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await revokeGoogleToken("some-refresh-token");

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    const body = new URLSearchParams(init?.body as string);
    expect(body.get("token")).toBe("some-refresh-token");
  });
});
