import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ポインターイベント（マウス・タッチ共通）でリストの並び替えをドラッグ操作できるようにする。
 * ドラッグ中は items の並び順をローカルに保持して表示に反映し、指を離した時点で
 * onReorder(orderedIds) を呼び出して確定する。
 */
export function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (orderedIds: string[]) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => items.map((item) => item.id));
  const orderRef = useRef(order);
  const onReorderRef = useRef(onReorder);
  const dragElRef = useRef<HTMLElement | null>(null);
  const grabOffsetYRef = useRef(0);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    if (draggingId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(items.map((item) => item.id));
    }
  }, [items, draggingId]);

  useEffect(() => {
    if (draggingId === null) return;

    const handleMove = (e: PointerEvent) => {
      // ドラッグ中の要素を、指/マウスの動きにそのまま追従させる（並び替えによって
      // 要素のレイアウト上の位置が変わっても、transform を一時的に外して測り直す
      // ことで見た目上は常にポインター位置に張り付くようにする）。
      const el = dragElRef.current;
      if (el) {
        el.style.transform = "none";
        const rect = el.getBoundingClientRect();
        el.style.transform = `translateY(${e.clientY - grabOffsetYRef.current - rect.top}px)`;
      }

      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-drag-id]");
      const overId = target?.dataset.dragId;
      if (!overId || overId === draggingId) return;
      setOrder((prev) => {
        const from = prev.indexOf(draggingId);
        const to = prev.indexOf(overId);
        if (from === -1 || to === -1 || from === to) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, draggingId);
        return next;
      });
    };

    const handleUp = () => {
      if (dragElRef.current) dragElRef.current.style.transform = "";
      dragElRef.current = null;
      setDraggingId(null);
      onReorderRef.current(orderRef.current);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingId]);

  const displayItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return order.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
  }, [order, items]);

  const dragHandleProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      const el =
        (e.currentTarget as HTMLElement | undefined)?.closest<HTMLElement>("[data-drag-id]") ??
        null;
      dragElRef.current = el;
      grabOffsetYRef.current = el ? e.clientY - el.getBoundingClientRect().top : 0;
      setDraggingId(id);
    },
  });

  return { displayItems, draggingId, dragHandleProps };
}
