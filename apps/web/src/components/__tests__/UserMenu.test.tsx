import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { UserMenu } from "../UserMenu";

const user = { id: "u1", email: "taro@example.com", name: "太郎", pictureUrl: null };

describe("UserMenu", () => {
  it("opens the menu and calls the matching handler when an item is selected", () => {
    const onOpenMetrics = jest.fn();
    const onOpenSettings = jest.fn();
    const onLogout = jest.fn();
    render(
      <UserMenu
        user={user}
        onOpenMetrics={onOpenMetrics}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "太郎 のメニュー" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "設定" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onOpenMetrics).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
    // 選択後はメニューを閉じる
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside of it", () => {
    render(
      <div>
        <UserMenu
          user={user}
          onOpenMetrics={jest.fn()}
          onOpenSettings={jest.fn()}
          onLogout={jest.fn()}
        />
        <button type="button">外側</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "太郎 のメニュー" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "外側" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("falls back to a person icon when the user has no picture", () => {
    render(
      <UserMenu
        user={user}
        onOpenMetrics={jest.fn()}
        onOpenSettings={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
    expect(document.querySelector("img.user-avatar")).not.toBeInTheDocument();
    expect(document.querySelector(".user-avatar-fallback")).toBeInTheDocument();
  });

  it("shows the user's picture when available", () => {
    render(
      <UserMenu
        user={{ ...user, pictureUrl: "https://example.com/avatar.png" }}
        onOpenMetrics={jest.fn()}
        onOpenSettings={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
    expect(document.querySelector("img.user-avatar")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
  });
});
