import type { User } from "@logue/shared";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export function UserMenu({
  user,
  onOpenMetrics,
  onOpenSettings,
  onLogout,
}: {
  user: User;
  onOpenMetrics: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = user.name ?? user.email;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const select = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div
      className="user-menu"
      ref={containerRef}
      onBlur={(e) => {
        // メニュー外にフォーカスが移ったら閉じる（Tabで最後の項目を抜けた場合など）。
        // 閉じないと、背後の画面内容がドロップダウンに視覚的に隠れたままフォーカス可能になってしまう。
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${displayName} のメニュー`}
        onClick={() => setOpen((v) => !v)}
      >
        {user.pictureUrl ? (
          <img src={user.pictureUrl} alt="" className="user-avatar" referrerPolicy="no-referrer" />
        ) : (
          <Icon name="account_circle" className="user-avatar-fallback" />
        )}
      </button>
      {open && (
        <div className="user-menu-dropdown" role="menu">
          <p className="user-menu-name">{displayName}</p>
          <button type="button" role="menuitem" onClick={() => select(onOpenMetrics)}>
            <Icon name="sell" />
            項目管理
          </button>
          <button type="button" role="menuitem" onClick={() => select(onOpenSettings)}>
            <Icon name="settings" />
            設定
          </button>
          <button type="button" role="menuitem" onClick={() => select(onLogout)}>
            <Icon name="logout" />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
