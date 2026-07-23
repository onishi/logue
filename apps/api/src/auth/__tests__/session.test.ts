import { SESSION_RENEW_THRESHOLD_SECONDS, shouldRenewSession } from "../session";

describe("shouldRenewSession", () => {
  it("returns false when the session has plenty of time left", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(
      shouldRenewSession({ sub: "user-1", exp: nowSeconds + SESSION_RENEW_THRESHOLD_SECONDS + 60 }),
    ).toBe(false);
  });

  it("returns true when the session is within the renewal threshold", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(
      shouldRenewSession({ sub: "user-1", exp: nowSeconds + SESSION_RENEW_THRESHOLD_SECONDS - 60 }),
    ).toBe(true);
  });

  it("returns true when the session has already expired", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(shouldRenewSession({ sub: "user-1", exp: nowSeconds - 10 })).toBe(true);
  });
});
