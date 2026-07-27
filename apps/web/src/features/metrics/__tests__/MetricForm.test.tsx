import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MetricForm } from "../MetricForm";

const GROUPS = [{ id: "g1", name: "体組成", sortOrder: 0 }];

describe("MetricForm", () => {
  it("shows an error when name is empty", async () => {
    const onSubmit = jest.fn();
    render(<MetricForm groups={GROUPS} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("名前を入力してください");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a number metric with the selected group", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<MetricForm groups={GROUPS} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("名前"), { target: { value: "体重" } });
    fireEvent.change(screen.getByLabelText("単位"), { target: { value: "kg" } });
    fireEvent.change(screen.getByLabelText("グループ"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "体重",
      unit: "kg",
      groupId: "g1",
      valueType: "number",
    });
  });

  it("requires at least one non-empty choice option for choice type", async () => {
    const onSubmit = jest.fn();
    render(<MetricForm groups={GROUPS} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("名前"), { target: { value: "気分" } });
    fireEvent.change(screen.getByLabelText("入力タイプ"), { target: { value: "choice" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("選択肢を1つ以上指定してください");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed, non-empty choice options", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<MetricForm groups={GROUPS} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("名前"), { target: { value: "気分" } });
    fireEvent.change(screen.getByLabelText("入力タイプ"), { target: { value: "choice" } });
    fireEvent.change(screen.getByLabelText("選択肢 1"), { target: { value: "良い" } });
    fireEvent.click(screen.getByRole("button", { name: "選択肢を追加" }));
    fireEvent.change(screen.getByLabelText("選択肢 2"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "選択肢を追加" }));
    fireEvent.change(screen.getByLabelText("選択肢 3"), { target: { value: "普通" } });

    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "気分",
      unit: null,
      groupId: null,
      valueType: "choice",
      choiceOptions: ["良い", "普通"],
    });
  });

  it("disables the value type field when editing an existing metric", () => {
    const metric = {
      id: "m1",
      groupId: null,
      name: "体重",
      valueType: "number" as const,
      unit: "kg",
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [],
    };
    render(<MetricForm groups={GROUPS} initial={metric} onSubmit={jest.fn()} />);

    expect(screen.getByLabelText("入力タイプ")).toBeDisabled();
    expect(screen.getByRole("button", { name: "更新" })).toBeInTheDocument();
  });
});
