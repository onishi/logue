import type { ApiClient } from "@logue/shared/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMetrics } from "../useMetrics";

function createClientMock(): ApiClient {
  return {
    metricGroups: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
    metrics: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    entries: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  } as unknown as ApiClient;
}

const METRIC = {
  id: "m1",
  groupId: null,
  name: "体重",
  valueType: "number" as const,
  unit: "kg",
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [],
};

describe("useMetrics", () => {
  it("requests includeArchived=false by default", async () => {
    const client = createClientMock();
    (client.metrics.list as jest.Mock).mockResolvedValue([METRIC]);

    const { result } = renderHook(() => useMetrics(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(client.metrics.list).toHaveBeenCalledWith({ includeArchived: false });
    expect(result.current.metrics).toEqual([METRIC]);
  });

  it("passes includeArchived through when requested", async () => {
    const client = createClientMock();
    (client.metrics.list as jest.Mock).mockResolvedValue([]);

    renderHook(() => useMetrics(client, { includeArchived: true }));

    await waitFor(() =>
      expect(client.metrics.list).toHaveBeenCalledWith({ includeArchived: true }),
    );
  });

  it("update() replaces the metric in place and re-sorts", async () => {
    const client = createClientMock();
    (client.metrics.list as jest.Mock).mockResolvedValue([METRIC]);
    (client.metrics.update as jest.Mock).mockResolvedValue({ ...METRIC, isArchived: true });

    const { result } = renderHook(() => useMetrics(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.update("m1", { isArchived: true });
    });

    expect(result.current.metrics[0]?.isArchived).toBe(true);
  });
});
