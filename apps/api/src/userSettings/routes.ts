import { Hono } from "hono";
import { updateUserSettingsInputSchema } from "@logue/shared";
import type { Env } from "../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import { findUserSettings, toPublicUserSettings, upsertUserSettings } from "../db/userSettings";

const userSettings = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

userSettings.use("*", requireAuth);

userSettings.get("/", async (c) => {
  const row = await findUserSettings(c.env.DB, c.get("user").id);
  return c.json(toPublicUserSettings(row));
});

userSettings.patch("/", async (c) => {
  const parsed = updateUserSettingsInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  const theme =
    parsed.data.theme === undefined
      ? undefined
      : parsed.data.theme === "system"
        ? null
        : parsed.data.theme;
  const updated = await upsertUserSettings(c.env.DB, c.get("user").id, { theme });
  return c.json(toPublicUserSettings(updated));
});

export default userSettings;
