import type { Env } from "../env";
import { createTestD1 } from "./testD1";

export function createTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: createTestD1(),
    WEB_ORIGIN: "http://localhost:5173",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-session-secret-please-ignore",
    ...overrides,
  };
}
