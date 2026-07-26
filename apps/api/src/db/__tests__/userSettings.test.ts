import { createFakeD1 } from "../../testing/fakeD1";
import { findUserSettings, toPublicUserSettings, upsertUserSettings } from "../userSettings";

describe("db/userSettings", () => {
  it("returns null when no settings row exists yet", async () => {
    const db = createFakeD1();
    expect(await findUserSettings(db, "u1")).toBeNull();
  });

  it("creates a settings row on first upsert", async () => {
    const db = createFakeD1();
    const created = await upsertUserSettings(db, "u1", { theme: "dark" });
    expect(created).toMatchObject({ user_id: "u1", theme: "dark" });
  });

  it("updates an existing settings row", async () => {
    const db = createFakeD1();
    await upsertUserSettings(db, "u1", { theme: "dark" });
    const updated = await upsertUserSettings(db, "u1", { theme: "light" });
    expect(updated).toMatchObject({ theme: "light" });
  });

  it("leaves the theme unchanged when patch.theme is undefined", async () => {
    const db = createFakeD1();
    await upsertUserSettings(db, "u1", { theme: "dark" });
    const updated = await upsertUserSettings(db, "u1", {});
    expect(updated).toMatchObject({ theme: "dark" });
  });

  it("maps a row to the public shape, defaulting to system", () => {
    expect(toPublicUserSettings(null)).toEqual({ theme: "system" });
    expect(
      toPublicUserSettings({ user_id: "u1", theme: null, created_at: "", updated_at: "" }),
    ).toEqual({ theme: "system" });
    expect(
      toPublicUserSettings({ user_id: "u1", theme: "dark", created_at: "", updated_at: "" }),
    ).toEqual({ theme: "dark" });
  });
});
