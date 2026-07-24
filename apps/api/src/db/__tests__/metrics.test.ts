import { createTestD1 } from "../../testing/testD1";
import { createTestUser } from "../../testing/fixtures";
import {
  createMetric,
  deleteMetric,
  findMetricById,
  listChoiceOptions,
  listMetrics,
  toPublicMetric,
  updateMetric,
} from "../metrics";
import { createEntry } from "../entries";

describe("db/metrics", () => {
  it("creates a number metric without choice options", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);

    const metric = await createMetric(db, userId, {
      name: "体重",
      valueType: "number",
      unit: "kg",
    });

    expect(metric.value_type).toBe("number");
    expect(await listChoiceOptions(db, metric.id)).toEqual([]);
  });

  it("creates a choice metric with ordered choice options", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);

    const metric = await createMetric(db, userId, {
      name: "気分",
      valueType: "choice",
      choiceOptions: ["良い", "普通", "悪い"],
    });

    const options = await listChoiceOptions(db, metric.id);
    expect(options.map((o) => o.label)).toEqual(["良い", "普通", "悪い"]);
  });

  it("excludes archived metrics by default and includes them when asked", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, { name: "体重", valueType: "number" });
    await updateMetric(db, userId, metric.id, { isArchived: true });

    expect(await listMetrics(db, userId)).toEqual([]);
    expect(await listMetrics(db, userId, { includeArchived: true })).toHaveLength(1);
  });

  it("replaces choice options on update", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, {
      name: "気分",
      valueType: "choice",
      choiceOptions: ["良い", "悪い"],
    });

    await updateMetric(db, userId, metric.id, { choiceOptions: ["最高", "普通", "最悪"] });

    const options = await listChoiceOptions(db, metric.id);
    expect(options.map((o) => o.label)).toEqual(["最高", "普通", "最悪"]);
  });

  it("refuses to delete a metric that has entries, but deletes one that has none", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, { name: "体重", valueType: "number" });

    await createEntry(db, userId, {
      metricId: metric.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(await deleteMetric(db, userId, metric.id)).toBe("has_entries");
    expect(await findMetricById(db, userId, metric.id)).not.toBeNull();

    const empty = await createMetric(db, userId, { name: "空腹感", valueType: "text" });
    expect(await deleteMetric(db, userId, empty.id)).toBe("deleted");
    expect(await findMetricById(db, userId, empty.id)).toBeNull();
  });

  it("maps a row and its choice options to the public shape", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, {
      name: "気分",
      valueType: "choice",
      choiceOptions: ["良い"],
    });
    const options = await listChoiceOptions(db, metric.id);

    const publicMetric = toPublicMetric(metric, options);
    expect(publicMetric.name).toBe("気分");
    expect(publicMetric.isArchived).toBe(false);
    expect(publicMetric.choiceOptions).toEqual([
      { id: options[0]?.id, label: "良い", sortOrder: 0 },
    ]);
  });
});
