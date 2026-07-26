import { act, renderHook, waitFor } from "@testing-library/react";
import { createMockApiServer } from "../../testing/mockApiServer";
import { useMetrics } from "../useMetrics";

const API_BASE_URL = "http://localhost:8787";

describe("useMetrics", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("creates a number metric and a choice metric with options", async () => {
    const { result } = renderHook(() => useMetrics(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    await act(async () => {
      await result.current.create({ name: "体重", type: "number", unit: "kg" });
    });
    await act(async () => {
      await result.current.create({
        name: "体調",
        type: "choice",
        choiceOptions: [{ label: "良い" }, { label: "悪い" }],
      });
    });

    expect(result.current.metrics).toHaveLength(2);
    expect(result.current.metrics[1]?.choiceOptions.map((o) => o.label)).toEqual(["良い", "悪い"]);
  });

  it("updates, archives, reorders and removes a metric", async () => {
    const { result } = renderHook(() => useMetrics(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    await act(async () => {
      await result.current.create({ name: "a", type: "text" });
    });
    await act(async () => {
      await result.current.create({ name: "b", type: "text" });
    });
    const [first, second] = result.current.metrics;

    await act(async () => {
      await result.current.update(first!.id, { isArchived: true });
    });
    expect(result.current.metrics.find((m) => m.id === first!.id)?.isArchived).toBe(true);

    await act(async () => {
      await result.current.reorder([second!.id, first!.id]);
    });
    expect(result.current.metrics.map((m) => m.name)).toEqual(["b", "a"]);

    await act(async () => {
      await result.current.remove(second!.id);
    });
    expect(result.current.metrics.map((m) => m.name)).toEqual(["a"]);
  });
});
