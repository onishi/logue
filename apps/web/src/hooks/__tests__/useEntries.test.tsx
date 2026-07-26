import { act, renderHook, waitFor } from "@testing-library/react";
import { createMockApiServer } from "../../testing/mockApiServer";
import { useEntries } from "../useEntries";

const API_BASE_URL = "http://localhost:8787";

describe("useEntries", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("creates, updates, filters and removes entries", async () => {
    const { result } = renderHook(() => useEntries(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    await act(async () => {
      await result.current.create({ metricId: "m1", value: "70", recordedAt: "2026-07-01" });
    });
    await act(async () => {
      await result.current.create({ metricId: "m1", value: "71", recordedAt: "2026-07-10" });
    });
    expect(result.current.entries).toHaveLength(2);

    const target = result.current.entries[0]!;
    await act(async () => {
      await result.current.update(target.id, { value: "72" });
    });
    expect(result.current.entries.find((e) => e.id === target.id)?.value).toBe("72");

    await act(async () => {
      await result.current.remove(target.id);
    });
    expect(result.current.entries).toHaveLength(1);
  });

  it("refetches when the metricId filter changes", async () => {
    server.entries.push(
      { id: "e1", metricId: "m1", value: "1", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "2", recordedAt: "2026-07-02" },
    );

    const { result, rerender } = renderHook(
      ({ metricId }) => useEntries(API_BASE_URL, { metricId }),
      {
        initialProps: { metricId: "m1" as string | undefined },
      },
    );
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.entries.map((e) => e.id)).toEqual(["e1"]);

    rerender({ metricId: "m2" });
    await waitFor(() => expect(result.current.entries.map((e) => e.id)).toEqual(["e2"]));
  });
});
