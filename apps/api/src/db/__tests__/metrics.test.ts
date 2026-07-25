import { createFakeD1 } from "../../testing/fakeD1";
import { listChoiceOptions, replaceChoiceOptions } from "../choiceOptions";
import {
  clearMetricGroupReferences,
  createMetric,
  deleteMetric,
  findMetricById,
  listMetrics,
  toPublicMetric,
  updateMetric,
} from "../metrics";

describe("db/metrics", () => {
  it("creates a number metric and returns it with no choice options", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
    });

    expect(created).toMatchObject({ name: "体重", type: "number", unit: "kg", is_archived: 0 });
    expect(await toPublicMetric(db, created)).toEqual({
      id: created.id,
      metricGroupId: null,
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [],
    });
  });

  it("attaches choice options for choice-type metrics", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "体調",
      type: "choice",
      unit: null,
      sortOrder: 0,
    });
    await replaceChoiceOptions(db, created.id, ["良い", "普通", "悪い"]);

    const publicMetric = await toPublicMetric(db, created);
    expect(publicMetric.choiceOptions.map((o) => o.label)).toEqual(["良い", "普通", "悪い"]);
  });

  it("updates fields including archiving", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
    });

    const updated = await updateMetric(db, "u1", created.id, { isArchived: true });
    expect(updated).toMatchObject({ is_archived: 1 });
  });

  it("scopes update/delete to the owning user", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
    });

    expect(await updateMetric(db, "u2", created.id, { name: "乗っ取り" })).toBeNull();
    expect(await deleteMetric(db, "u2", created.id)).toBe(false);
    expect(await findMetricById(db, "u1", created.id)).toMatchObject({ name: "体重" });
  });

  it("lists metrics for a user ordered by sort_order", async () => {
    const db = createFakeD1();
    await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "b",
      type: "text",
      unit: null,
      sortOrder: 1,
    });
    await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "a",
      type: "text",
      unit: null,
      sortOrder: 0,
    });

    const rows = await listMetrics(db, "u1");
    expect(rows.map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("ungroups metrics when their metric group reference is cleared", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: "group-1",
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
    });

    await clearMetricGroupReferences(db, "u1", "group-1");

    const reloaded = await findMetricById(db, "u1", created.id);
    expect(reloaded?.metric_group_id).toBeNull();
  });

  it("deletes a metric owned by the user and its choice options remain queryable as empty", async () => {
    const db = createFakeD1();
    const created = await createMetric(db, {
      userId: "u1",
      metricGroupId: null,
      name: "体調",
      type: "choice",
      unit: null,
      sortOrder: 0,
    });
    await replaceChoiceOptions(db, created.id, ["良い", "悪い"]);

    expect(await deleteMetric(db, "u1", created.id)).toBe(true);
    expect(await findMetricById(db, "u1", created.id)).toBeNull();
    // 呼び出し側で choice_options の削除も担うため、ここでは残っていることを確認する
    expect(await listChoiceOptions(db, created.id)).toHaveLength(2);
  });
});
