import { createFakeD1 } from "../../testing/fakeD1";
import {
  createMetricGroup,
  deleteMetricGroup,
  findMetricGroupById,
  listMetricGroups,
  toPublicMetricGroup,
  updateMetricGroup,
} from "../metricGroups";

describe("db/metricGroups", () => {
  it("creates and lists metric groups ordered by sort_order", async () => {
    const db = createFakeD1();
    await createMetricGroup(db, { userId: "u1", name: "食事", sortOrder: 1 });
    await createMetricGroup(db, { userId: "u1", name: "体組成", sortOrder: 0 });
    await createMetricGroup(db, { userId: "u2", name: "他人のグループ", sortOrder: 0 });

    const rows = await listMetricGroups(db, "u1");
    expect(rows.map((r) => r.name)).toEqual(["体組成", "食事"]);
  });

  it("updates only the provided fields and bumps updated_at", async () => {
    const db = createFakeD1();
    const created = await createMetricGroup(db, { userId: "u1", name: "体組成", sortOrder: 0 });

    const updated = await updateMetricGroup(db, "u1", created.id, { name: "からだ" });
    expect(updated).toMatchObject({ name: "からだ", sort_order: 0 });
  });

  it("does not update or delete another user's metric group", async () => {
    const db = createFakeD1();
    const created = await createMetricGroup(db, { userId: "u1", name: "体組成", sortOrder: 0 });

    expect(await updateMetricGroup(db, "u2", created.id, { name: "乗っ取り" })).toBeNull();
    expect(await deleteMetricGroup(db, "u2", created.id)).toBe(false);
    expect(await findMetricGroupById(db, "u1", created.id)).toMatchObject({ name: "体組成" });
  });

  it("deletes a metric group owned by the user", async () => {
    const db = createFakeD1();
    const created = await createMetricGroup(db, { userId: "u1", name: "体組成", sortOrder: 0 });
    expect(await deleteMetricGroup(db, "u1", created.id)).toBe(true);
    expect(await findMetricGroupById(db, "u1", created.id)).toBeNull();
  });

  it("maps a row to the public shape", async () => {
    const db = createFakeD1();
    const created = await createMetricGroup(db, { userId: "u1", name: "体組成", sortOrder: 2 });
    expect(toPublicMetricGroup(created)).toEqual({ id: created.id, name: "体組成", sortOrder: 2 });
  });
});
