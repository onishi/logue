const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  accessType?: "online" | "offline";
  prompt?: string;
}): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scope ?? "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", params.accessType ?? "online");
  url.searchParams.set("prompt", params.prompt ?? "select_account");
  return url.toString();
}

export async function exchangeGoogleCodeForTokens(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
      code_verifier: params.codeVerifier,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google トークン交換に失敗しました: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}

/** 保存済みの refresh_token から新しいアクセストークンを取得する。 */
export async function refreshGoogleAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google アクセストークンの更新に失敗しました: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}

/** 連携解除時に refresh_token を無効化する（ベストエフォート）。 */
export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(GOOGLE_REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Google ユーザー情報の取得に失敗しました: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}
