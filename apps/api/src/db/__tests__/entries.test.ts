import { createTestD1 } from "../../testing/testD1";
import { createTestUser } from "../../testing/fixtures";
import { createMetric } from "../metrics";
import { createEntry, deleteEntry, listEntries, toPublicEntry, updateEntry } from "../entries";

describe("db/entries", () => {
  it("creates and lists entries ordered by recorded_at desc", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, { name: "体重", valueType: "number" });

    await createEntry(db, userId, {
      metricId: metric.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });
    await createEntry(db, userId, {
      metricId: metric.id,
      valueNumber: 64.5,
      valueText: null,
      recordedAt: "2026-07-02T00:00:00.000Z",
    });

    const entries = await listEntries(db, userId);
    expect(entries.map((e) => e.recorded_at)).toEqual([
      "2026-07-02T00:00:00.000Z",
      "2026-07-01T00:00:00.000Z",
    ]);
  });

  it("filters by metricId and date range", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const weight = await createMetric(db, userId, { name: "体重", valueType: "number" });
    const mood = await createMetric(db, userId, { name: "気分", valueType: "text" });

    await createEntry(db, userId, {
      metricId: weight.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });
    await createEntry(db, userId, {
      metricId: mood.id,
      valueNumber: null,
      valueText: "良い",
      recordedAt: "2026-07-05T00:00:00.000Z",
    });

    expect(await listEntries(db, userId, { metricId: weight.id })).toHaveLength(1);
    expect(await listEntries(db, userId, { from: "2026-07-03T00:00:00.000Z" })).toHaveLength(1);
    expect(await listEntries(db, userId, { to: "2026-07-03T00:00:00.000Z" })).toHaveLength(1);
  });

  it("updates and deletes an entry", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, { name: "体重", valueType: "number" });
    const entry = await createEntry(db, userId, {
      metricId: metric.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });

    const updated = await updateEntry(db, userId, entry.id, { valueNumber: 64 });
    expect(updated?.value_number).toBe(64);

    expect(await deleteEntry(db, userId, entry.id)).toBe(true);
    expect(await listEntries(db, userId)).toEqual([]);
  });

  it("maps a row to the public shape", async () => {
    const db = createTestD1();
    const userId = await createTestUser(db);
    const metric = await createMetric(db, userId, { name: "体重", valueType: "number" });
    const entry = await createEntry(db, userId, {
      metricId: metric.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(toPublicEntry(entry)).toEqual({
      id: entry.id,
      metricId: metric.id,
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });
  });
});
