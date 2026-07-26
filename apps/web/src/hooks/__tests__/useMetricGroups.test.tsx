import { act, renderHook, waitFor } from "@testing-library/react";
import { createMockApiServer } from "../../testing/mockApiServer";
import { useMetricGroups } from "../useMetricGroups";

const API_BASE_URL = "http://localhost:8787";

describe("useMetricGroups", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("loads groups on mount", async () => {
    const { result } = renderHook(() => useMetricGroups(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.groups).toEqual([]);
  });

  it("creates, updates, reorders and removes groups", async () => {
    const { result } = renderHook(() => useMetricGroups(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    await act(async () => {
      await result.current.create({ name: "体組成" });
    });
    await act(async () => {
      await result.current.create({ name: "食事" });
    });
    expect(result.current.groups.map((g) => g.name)).toEqual(["体組成", "食事"]);

    const [first, second] = result.current.groups;
    await act(async () => {
      await result.current.update(first!.id, { name: "からだ" });
    });
    expect(result.current.groups[0]).toMatchObject({ name: "からだ" });

    await act(async () => {
      await result.current.reorder([second!.id, first!.id]);
    });
    expect(result.current.groups.map((g) => g.name)).toEqual(["食事", "からだ"]);

    await act(async () => {
      await result.current.remove(first!.id);
    });
    expect(result.current.groups.map((g) => g.name)).toEqual(["食事"]);
  });
});
