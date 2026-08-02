import { cellKey, mergeCells } from "../merge";

const KEY = cellKey("m1", "2026-07-01");

function map(entries: [string, string][]): Map<string, string> {
  return new Map(entries);
}

describe("mergeCells", () => {
  it("keeps a cell unchanged when app and sheet already agree", () => {
    const app = map([[KEY, "70"]]);
    const sheet = map([[KEY, "70"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "70"]]));
  });

  it("propagates an app-only change to the merged result (app -> sheet)", () => {
    const app = map([[KEY, "71"]]);
    const sheet = map([[KEY, "70"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "71"]]));
  });

  it("propagates a sheet-only change to the merged result (sheet -> app)", () => {
    const app = map([[KEY, "70"]]);
    const sheet = map([[KEY, "72"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "72"]]));
  });

  it("prefers the sheet value when both sides changed to different values (conflict)", () => {
    const app = map([[KEY, "71"]]);
    const sheet = map([[KEY, "73"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "73"]]));
  });

  it("treats both sides changing to the same value as agreement, not a conflict", () => {
    const app = map([[KEY, "75"]]);
    const sheet = map([[KEY, "75"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "75"]]));
  });

  it("propagates an app-side deletion (value cleared) to the sheet", () => {
    const app = map([]); // アプリ側で削除済み
    const sheet = map([[KEY, "70"]]);
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([]));
  });

  it("propagates a sheet-side deletion (cell cleared) to the app", () => {
    const app = map([[KEY, "70"]]);
    const sheet = map([]); // シート側でセルが空になった
    const snapshot = map([[KEY, "70"]]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([]));
  });

  it("adds a brand new cell introduced only on the app side (not in snapshot)", () => {
    const app = map([[KEY, "70"]]);
    const sheet = map([]);
    const snapshot = map([]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "70"]]));
  });

  it("adds a brand new cell introduced only on the sheet side (not in snapshot)", () => {
    const app = map([]);
    const sheet = map([[KEY, "70"]]);
    const snapshot = map([]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(map([[KEY, "70"]]));
  });

  it("keeps a cell absent when it has never existed on either side", () => {
    expect(mergeCells(map([]), map([]), map([]))).toEqual(map([]));
  });

  it("handles multiple independent cells without cross-contamination", () => {
    const key2 = cellKey("m2", "2026-07-02");
    const app = map([
      [KEY, "71"], // app changed
      [key2, "o1"], // unchanged
    ]);
    const sheet = map([
      [KEY, "70"],
      [key2, "o1"],
    ]);
    const snapshot = map([
      [KEY, "70"],
      [key2, "o1"],
    ]);
    expect(mergeCells(app, sheet, snapshot)).toEqual(
      map([
        [KEY, "71"],
        [key2, "o1"],
      ]),
    );
  });
});
