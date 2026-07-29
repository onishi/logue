import { MATERIAL_SYMBOL_PATHS, type MaterialSymbolName } from "./materialSymbols";

export function Icon({ name, className }: { name: MaterialSymbolName; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 -960 960 960"
      aria-hidden="true"
      focusable="false"
    >
      <path d={MATERIAL_SYMBOL_PATHS[name]} />
    </svg>
  );
}
