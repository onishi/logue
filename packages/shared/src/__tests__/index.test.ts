import { PACKAGE_NAME } from "../index";

describe("@logue/shared", () => {
  it("exports its package name", () => {
    expect(PACKAGE_NAME).toBe("@logue/shared");
  });
});
