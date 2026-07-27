import { createFakeD1 } from "../../testing/fakeD1";
import {
  deleteEntriesByMetricId,
  deleteEntry,
  findEntryById,
  listEntries,
  toPublicEntry,
  updateEntry,
  upsertEntry,
} from "../entries";

async function createEntry(
  db: ReturnType<typeof createFakeD1>,
  params: { userId: string; metricId: string; value: string; recordedAt: string },
) {
  const { entry } = await upsertEntry(db, params);
  return entry;
}

describe("db/entries", () => {
  it("creates and finds an entry scoped to the user", async () => {
    const db = createFakeD1();
    const created = await createEntry(db, {
      userId: "u1",
      metricId: "m1",
      value: "70.2",
      recordedAt: "2026-07-20",
    });

    expect(await findEntryById(db, "u1", created.id)).toMatchObject({ value: "70.2" });
    expect(await findEntryById(db, "u2", created.id)).toBeNull();
  });

  it("filters by metricId and a recordedAt range", async () => {
    const db = createFakeD1();
    await createEntry(db, { userId: "u1", metricId: "m1", value: "70", recordedAt: "2026-07-01" });
    await createEntry(db, { userId: "u1", metricId: "m1", value: "71", recordedAt: "2026-07-10" });
    await createEntry(db, { userId: "u1", metricId: "m2", value: "1", recordedAt: "2026-07-10" });

    const byMetric = await listEntries(db, "u1", { metricId: "m1" });
    expect(byMetric).toHaveLength(2);

    const byRange = await listEntries(db, "u1", {
      metricId: "m1",
      from: "2026-07-05",
      to: "2026-07-15",
    });
    expect(byRange.map((e) => e.value)).toEqual(["71"]);
  });

  it("updates value and recordedAt independently", async () => {
    const db = createFakeD1();
    const created = await createEntry(db, {
      userId: "u1",
      metricId: "m1",
      value: "70",
      recordedAt: "2026-07-20",
    });

    const updated = await updateEntry(db, "u1", created.id, { value: "72" });
    expect(updated).toMatchObject({ value: "72", recorded_at: "2026-07-20" });

    expect(await updateEntry(db, "u2", created.id, { value: "999" })).toBeNull();
  });

  it("deletes an entry and bulk-deletes by metricId", async () => {
    const db = createFakeD1();
    const created = await createEntry(db, {
      userId: "u1",
      metricId: "m1",
      value: "70",
      recordedAt: "2026-07-20",
    });
    expect(await deleteEntry(db, "u2", created.id)).toBe(false);
    expect(await deleteEntry(db, "u1", created.id)).toBe(true);

    await createEntry(db, { userId: "u1", metricId: "m1", value: "1", recordedAt: "2026-07-01" });
    await createEntry(db, { userId: "u1", metricId: "m1", value: "2", recordedAt: "2026-07-02" });
    await deleteEntriesByMetricId(db, "m1");
    expect(await listEntries(db, "u1", { metricId: "m1" })).toHaveLength(0);
  });

  it("upsertEntry updates the existing entry instead of creating a duplicate for the same metric/day", async () => {
    const db = createFakeD1();
    const first = await upsertEntry(db, {
      userId: "u1",
      metricId: "m1",
      value: "70",
      recordedAt: "2026-07-20",
    });
    expect(first.created).toBe(true);
    expect(first.entry.value).toBe("70");

    const second = await upsertEntry(db, {
      userId: "u1",
      metricId: "m1",
      value: "71.5",
      recordedAt: "2026-07-20",
    });
    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.value).toBe("71.5");

    const entriesForDay = await listEntries(db, "u1", {
      metricId: "m1",
      from: "2026-07-20",
      to: "2026-07-20",
    });
    expect(entriesForDay).toHaveLength(1);
    expect(entriesForDay[0]?.value).toBe("71.5");
  });

  it("upsertEntry treats a different metric or a different day as a separate entry", async () => {
    const db = createFakeD1();
    await upsertEntry(db, { userId: "u1", metricId: "m1", value: "70", recordedAt: "2026-07-20" });
    await upsertEntry(db, { userId: "u1", metricId: "m2", value: "1", recordedAt: "2026-07-20" });
    await upsertEntry(db, { userId: "u1", metricId: "m1", value: "72", recordedAt: "2026-07-21" });

    expect(await listEntries(db, "u1", {})).toHaveLength(3);
  });

  it("maps a row to the public shape", () => {
    expect(
      toPublicEntry({
        id: "e1",
        user_id: "u1",
        metric_id: "m1",
        value: "70",
        recorded_at: "2026-07-20",
        created_at: "2026-07-20T00:00:00.000Z",
        updated_at: "2026-07-20T00:00:00.000Z",
      }),
    ).toEqual({ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-20" });
  });
});
