import { useId, useState } from "react";
import { Icon } from "./Icon";

export function CollapsibleSection({
  label,
  ariaLabel,
  defaultOpen = false,
  children,
}: {
  label: string;
  ariaLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="collapsible">
      <button
        type="button"
        className="collapsible-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        <Icon name={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
      </button>
      {open && (
        <div id={contentId} className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
