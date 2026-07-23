import { createFakeD1 } from "../../testing/fakeD1";
import { createUser, findUserByGoogleSub, findUserById, toPublicUser } from "../users";

describe("db/users", () => {
  it("creates a user and finds it by google_sub / id", async () => {
    const db = createFakeD1();

    const created = await createUser(db, {
      googleSub: "google-sub-1",
      email: "taro@example.com",
      name: "Taro",
      pictureUrl: "https://example.com/taro.png",
    });

    expect(created.google_sub).toBe("google-sub-1");

    const byGoogleSub = await findUserByGoogleSub(db, "google-sub-1");
    expect(byGoogleSub?.id).toBe(created.id);

    const byId = await findUserById(db, created.id);
    expect(byId?.email).toBe("taro@example.com");

    expect(await findUserByGoogleSub(db, "unknown")).toBeNull();
    expect(await findUserById(db, "unknown")).toBeNull();
  });

  it("maps a user row to the public user shape", async () => {
    const db = createFakeD1();
    const created = await createUser(db, {
      googleSub: "google-sub-2",
      email: "hanako@example.com",
      name: null,
      pictureUrl: null,
    });

    expect(toPublicUser(created)).toEqual({
      id: created.id,
      email: "hanako@example.com",
      name: null,
      pictureUrl: null,
    });
  });
});
