import type { Env } from "../env";
import { createAuthCookieHeader } from "./auth";
import { createTestUser } from "./fixtures";
import { createTestEnv } from "./testEnv";

export async function createAuthenticatedTestContext(): Promise<{
  env: Env;
  userId: string;
  cookie: string;
}> {
  const env = createTestEnv();
  const userId = await createTestUser(env.DB);
  const cookie = await createAuthCookieHeader(env.SESSION_SECRET, userId);
  return { env, userId, cookie };
}
