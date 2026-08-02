import { toCsv } from "../csv";

describe("toCsv", () => {
  it("joins rows and fields with commas and CRLF", () => {
    expect(
      toCsv([
        ["日付", "体重（kg）"],
        ["2026-07-01", "70"],
        ["2026-07-02", "71.5"],
      ]),
    ).toBe("日付,体重（kg）\r\n2026-07-01,70\r\n2026-07-02,71.5");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv([["a,b", 'say "hi"', "line1\nline2"]])).toBe('"a,b","say ""hi""","line1\nline2"');
  });

  it("leaves plain fields (including empty ones) unquoted", () => {
    expect(toCsv([["体重", "", "70"]])).toBe("体重,,70");
  });
});
