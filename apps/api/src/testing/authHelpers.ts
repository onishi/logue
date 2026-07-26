import app from "../index";
import type { Env } from "../env";

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0] ?? "";
}

function findSetCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

export type GoogleUser = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

const DEFAULT_GOOGLE_USER: GoogleUser = {
  sub: "google-sub-1",
  email: "taro@example.com",
  name: "Taro",
  picture: null,
};

export function mockGoogleOAuth(): {
  spy: jest.SpiedFunction<typeof fetch>;
  setUser: (user: GoogleUser) => void;
} {
  let currentUser: GoogleUser = DEFAULT_GOOGLE_USER;
  const spy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "fake-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
      return new Response(JSON.stringify(currentUser), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch to ${url}`);
  });
  return { spy, setUser: (user) => (currentUser = user) };
}

/** Google ログインフローを通しで実行し、セッション Cookie ヘッダーを返す。呼び出し前に mockGoogleOAuth() が必要。 */
export async function loginAsTestUser(env: Env): Promise<string> {
  const loginRes = await app.request("/api/auth/login", {}, env);
  const location = new URL(loginRes.headers.get("Location") ?? "");
  const state = location.searchParams.get("state") ?? "";
  const oauthCookie = findSetCookie(loginRes, "logue_oauth");
  const oauthCookieHeader = oauthCookie ? cookiePair(oauthCookie) : "";

  const callbackRes = await app.request(
    `/api/auth/callback?code=fake-code&state=${state}`,
    { headers: { Cookie: oauthCookieHeader } },
    env,
  );
  const sessionCookie = findSetCookie(callbackRes, "logue_session");
  return cookiePair(sessionCookie ?? "");
}
