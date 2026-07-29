import type { PointerEvent } from "react";

// Material デザインのリップルエフェクトを、リップル用のDOMノードを作らずに
// CSS変数 + クラス切り替えだけで実現する（React管理下のbuttonの子要素を直接いじると
// 再レンダー時にReactのDOM差分計算と衝突しうるため、避けている）。
export function handleRippleDown(e: PointerEvent<HTMLElement>): void {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("button");
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;

  const rect = button.getBoundingClientRect();
  button.style.setProperty("--ripple-x", `${e.clientX - rect.left}px`);
  button.style.setProperty("--ripple-y", `${e.clientY - rect.top}px`);

  // 連続クリックでもアニメーションを再生させるため、一度クラスを外してから
  // reflow を挟んで付け直す。
  button.classList.remove("rippling");
  void button.offsetWidth;
  button.classList.add("rippling");
}
