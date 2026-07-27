export type SortableItem = { id: string; sortOrder: number };

/**
 * items は表示順（sortOrder 昇順）に並んでいる前提。index の要素を隣と入れ替えたときの
 * sortOrder 更新内容を返す。端に達していて動かせない場合は null を返す。
 */
export function computeReorder<T extends SortableItem>(
  items: T[],
  index: number,
  direction: "up" | "down",
): Array<{ id: string; sortOrder: number }> | null {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= items.length || targetIndex < 0 || targetIndex >= items.length) {
    return null;
  }

  const current = items[index];
  const target = items[targetIndex];
  if (!current || !target) {
    return null;
  }

  return [
    { id: current.id, sortOrder: target.sortOrder },
    { id: target.id, sortOrder: current.sortOrder },
  ];
}
