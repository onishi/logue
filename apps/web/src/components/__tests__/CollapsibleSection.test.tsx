import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CollapsibleSection } from "../CollapsibleSection";

describe("CollapsibleSection", () => {
  it("is closed by default and hides its content", () => {
    render(
      <CollapsibleSection label="絞り込み">
        <p>中身</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: "絞り込み" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("中身")).not.toBeInTheDocument();
  });

  it("opens to reveal its content when the toggle is clicked, and closes again", () => {
    render(
      <CollapsibleSection label="絞り込み">
        <p>中身</p>
      </CollapsibleSection>,
    );

    fireEvent.click(screen.getByRole("button", { name: "絞り込み" }));
    expect(screen.getByText("中身")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "絞り込み" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "絞り込み" }));
    expect(screen.queryByText("中身")).not.toBeInTheDocument();
  });

  it("respects defaultOpen", () => {
    render(
      <CollapsibleSection label="絞り込み" defaultOpen>
        <p>中身</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("中身")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "絞り込み" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
