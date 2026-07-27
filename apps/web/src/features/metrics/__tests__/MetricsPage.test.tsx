import type { ApiClient } from "@logue/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MetricsPage } from "../MetricsPage";

function createClientMock(): ApiClient {
  return {
    metricGroups: {
      list: jest.fn().mockResolvedValue([{ id: "g1", name: "体組成", sortOrder: 0 }]),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    metrics: {
      list: jest.fn().mockResolvedValue([
        {
          id: "m1",
          groupId: "g1",
          name: "体重",
          valueType: "number",
          unit: "kg",
          sortOrder: 0,
          isArchived: false,
          choiceOptions: [],
        },
      ]),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    entries: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  } as unknown as ApiClient;
}

describe("MetricsPage", () => {
  it("shows groups and their metrics once loaded", async () => {
    const client = createClientMock();
    render(<MetricsPage client={client} />);

    await waitFor(() => expect(screen.getAllByText("体組成").length).toBeGreaterThan(0));
    expect(screen.getByText("体重")).toBeInTheDocument();
    expect(screen.getByText("未分類")).toBeInTheDocument();
  });

  it("creates a new metric group", async () => {
    const client = createClientMock();
    (client.metricGroups.create as jest.Mock).mockResolvedValue({
      id: "g2",
      name: "筋トレ",
      sortOrder: 1,
    });
    render(<MetricsPage client={client} />);

    await waitFor(() => expect(screen.getAllByText("体組成").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText("新しいグループ"), { target: { value: "筋トレ" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(client.metricGroups.create).toHaveBeenCalledWith({ name: "筋トレ" }),
    );
  });

  it("archives a metric", async () => {
    const client = createClientMock();
    (client.metrics.update as jest.Mock).mockResolvedValue({
      id: "m1",
      groupId: "g1",
      name: "体重",
      valueType: "number",
      unit: "kg",
      sortOrder: 0,
      isArchived: true,
      choiceOptions: [],
    });
    render(<MetricsPage client={client} />);

    await waitFor(() => expect(screen.getByText("体重")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "アーカイブ" }));

    await waitFor(() =>
      expect(client.metrics.update).toHaveBeenCalledWith("m1", { isArchived: true }),
    );
  });
});
