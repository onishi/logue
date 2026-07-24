import { createTestD1 } from "../../testing/testD1";
import { createTestUser } from "../../testing/fixtures";
import {
  createMetricGroup,
  deleteMetricGroup,
  listMetricGroups,
  toPublicMetricGroup,
  updateMetricGroup,
} from "../metricGroups";

describe("db/metricGroups", () => {
  it("creates groups with incrementing sort order and lists them in order", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);

    const first = await createMetricGroup(db, userId, { name: "体組成" });
    const second = await createMetricGroup(db, userId, { name: "筋トレ" });

    expect(first.sort_order).toBe(0);
    expect(second.sort_order).toBe(1);

    const groups = await listMetricGroups(db, userId);
    expect(groups.map((g) => g.name)).toEqual(["体組成", "筋トレ"]);
  });

  it("updates a group's name and sort order", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const group = await createMetricGroup(db, userId, { name: "体組成" });

    const updated = await updateMetricGroup(db, userId, group.id, { name: "からだ", sortOrder: 5 });

    expect(updated?.name).toBe("からだ");
    expect(updated?.sort_order).toBe(5);
  });

  it("does not let a user access another user's group", async () => {
    const db = createTestD1();
    const ownerId = await createTestUser(db);
    const otherId = await createTestUser(db);
    const group = await createMetricGroup(db, ownerId, { name: "体組成" });

    expect(await updateMetricGroup(db, otherId, group.id, { name: "乗っ取り" })).toBeNull();
    expect(await deleteMetricGroup(db, otherId, group.id)).toBe(false);
  });

  it("deletes a group", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const group = await createMetricGroup(db, userId, { name: "体組成" });

    expect(await deleteMetricGroup(db, userId, group.id)).toBe(true);
    expect(await listMetricGroups(db, userId)).toEqual([]);
  });

  it("maps a row to the public shape", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const group = await createMetricGroup(db, userId, { name: "体組成" });

    expect(toPublicMetricGroup(group)).toEqual({ id: group.id, name: "体組成", sortOrder: 0 });
  });
});
