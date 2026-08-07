import type { Env } from "../env";
import { createFakeD1 } from "./fakeD1";

export function createTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: createFakeD1(),
    WEB_ORIGIN: "http://localhost:5173",
    WEB_APP_URL: "http://localhost:5173/logue",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-session-secret-please-ignore",
    ...overrides,
  };
}
