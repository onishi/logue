import { createFakeD1 } from "../fakeD1";

type MetricGroupRow = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
};

describe("FakeD1", () => {
  it("supports INSERT then SELECT with ORDER BY", async () => {
    const db = createFakeD1();
    await db
      .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
      .bind("g2", "u1", "食事", 1)
      .run();
    await db
      .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
      .bind("g1", "u1", "体組成", 0)
      .run();

    const { results } = await db
      .prepare("SELECT * FROM metric_groups WHERE user_id = ? ORDER BY sort_order")
      .bind("u1")
      .all<MetricGroupRow>();

    expect(results.map((r) => r.id)).toEqual(["g1", "g2"]);
  });

  it("supports UPDATE scoped by multiple WHERE conditions", async () => {
    const db = createFakeD1();
    await db
      .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
      .bind("g1", "u1", "体組成", 0)
      .run();

    const result = await db
      .prepare("UPDATE metric_groups SET name = ?, sort_order = ? WHERE id = ? AND user_id = ?")
      .bind("体重", 5, "g1", "u1")
      .run();
    expect(result.meta.changes).toBe(1);

    const updated = await db
      .prepare("SELECT * FROM metric_groups WHERE id = ? AND user_id = ?")
      .bind("g1", "u1")
      .first<MetricGroupRow>();
    expect(updated).toMatchObject({ name: "体重", sort_order: 5 });

    const wrongUser = await db
      .prepare("UPDATE metric_groups SET name = ? WHERE id = ? AND user_id = ?")
      .bind("乗っ取り", "g1", "u2")
      .run();
    expect(wrongUser.meta.changes).toBe(0);
  });

  it("supports DELETE scoped by WHERE and reports changes", async () => {
    const db = createFakeD1();
    await db
      .prepare("INSERT INTO metric_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)")
      .bind("g1", "u1", "体組成", 0)
      .run();

    const missing = await db
      .prepare("DELETE FROM metric_groups WHERE id = ? AND user_id = ?")
      .bind("g1", "u2")
      .run();
    expect(missing.meta.changes).toBe(0);

    const deleted = await db
      .prepare("DELETE FROM metric_groups WHERE id = ? AND user_id = ?")
      .bind("g1", "u1")
      .run();
    expect(deleted.meta.changes).toBe(1);

    const remaining = await db
      .prepare("SELECT * FROM metric_groups WHERE user_id = ?")
      .bind("u1")
      .all<MetricGroupRow>();
    expect(remaining.results).toHaveLength(0);
  });

  it("supports range conditions used for entries date filtering", async () => {
    const db = createFakeD1();
    for (const recordedAt of ["2026-07-01", "2026-07-10", "2026-07-20"]) {
      await db
        .prepare(
          "INSERT INTO entries (id, user_id, metric_id, value, recorded_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(`e-${recordedAt}`, "u1", "m1", "70", recordedAt)
        .run();
    }

    const { results } = await db
      .prepare(
        "SELECT * FROM entries WHERE user_id = ? AND recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at",
      )
      .bind("u1", "2026-07-05", "2026-07-15")
      .all<{ id: string }>();

    expect(results.map((r) => r.id)).toEqual(["e-2026-07-10"]);
  });

  it("throws on unsupported query shapes", async () => {
    const db = createFakeD1();
    await expect(
      db.prepare("SELECT * FROM metric_groups JOIN metrics ON 1=1").bind().all(),
    ).rejects.toThrow(/unsupported/);
  });
});
