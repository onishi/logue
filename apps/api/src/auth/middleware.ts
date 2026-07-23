import type { Context, Next } from "hono";
import type { Env } from "../env";
import { findUserById, toPublicUser } from "../db/users";
import { readSessionPayload, shouldRenewSession, writeSessionCookie } from "./session";
import type { User } from "@logue/shared";

export type AuthVariables = {
  user: User;
};

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next,
) {
  const payload = await readSessionPayload(c, c.env.SESSION_SECRET);
  if (!payload) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const userRow = await findUserById(c.env.DB, payload.sub);
  if (!userRow) {
    return c.json({ error: "unauthorized" }, 401);
  }

  if (shouldRenewSession(payload)) {
    await writeSessionCookie(c, c.env.SESSION_SECRET, payload.sub);
  }

  c.set("user", toPublicUser(userRow));
  await next();
}
