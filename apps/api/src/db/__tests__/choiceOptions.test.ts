import { createFakeD1 } from "../../testing/fakeD1";
import {
  deleteChoiceOptions,
  listChoiceOptions,
  replaceChoiceOptions,
  toPublicChoiceOption,
} from "../choiceOptions";

describe("db/choiceOptions", () => {
  it("replaces existing options and preserves label order", async () => {
    const db = createFakeD1();
    await replaceChoiceOptions(db, "m1", ["良い", "普通", "悪い"]);
    const first = await listChoiceOptions(db, "m1");
    expect(first.map((o) => o.label)).toEqual(["良い", "普通", "悪い"]);

    const replaced = await replaceChoiceOptions(db, "m1", ["はい", "いいえ"]);
    expect(replaced.map((o) => o.label)).toEqual(["はい", "いいえ"]);
  });

  it("deletes all options for a metric", async () => {
    const db = createFakeD1();
    await replaceChoiceOptions(db, "m1", ["良い", "悪い"]);
    await deleteChoiceOptions(db, "m1");
    expect(await listChoiceOptions(db, "m1")).toHaveLength(0);
  });

  it("maps a row to the public shape", () => {
    expect(
      toPublicChoiceOption({ id: "o1", metric_id: "m1", label: "良い", sort_order: 0 }),
    ).toEqual({
      id: "o1",
      label: "良い",
      sortOrder: 0,
    });
  });
});
