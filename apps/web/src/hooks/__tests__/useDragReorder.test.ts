import { act, renderHook } from "@testing-library/react";
import { useDragReorder } from "../useDragReorder";

type Item = { id: string };

// jsdom は PointerEvent コンストラクタを実装していないため、document への
// pointermove/pointerup ディスパッチには（同じ type 文字列で発火する）MouseEvent を使う。

function makePointerDownEvent(): React.PointerEvent {
  return {
    preventDefault: jest.fn(),
    button: 0,
    pointerType: "mouse",
  } as unknown as React.PointerEvent;
}

describe("useDragReorder", () => {
  const items: Item[] = [{ id: "a" }, { id: "b" }, { id: "c" }];

  beforeEach(() => {
    document.body.innerHTML =
      '<div data-drag-id="a"></div><div data-drag-id="b"></div><div data-drag-id="c"></div>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("returns items in their original order before any drag starts", () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragReorder(items, onReorder));
    expect(result.current.displayItems).toEqual(items);
    expect(result.current.draggingId).toBeNull();
  });

  it("live-reorders while dragging and commits the new order on pointerup", () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragReorder(items, onReorder));

    const elB = document.querySelector('[data-drag-id="b"]') as HTMLElement;
    document.elementFromPoint = jest.fn().mockReturnValue(elB);

    act(() => {
      result.current.dragHandleProps("a").onPointerDown(makePointerDownEvent());
    });
    expect(result.current.draggingId).toBe("a");

    act(() => {
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10 }));
    });
    expect(result.current.displayItems.map((i) => i.id)).toEqual(["b", "a", "c"]);

    act(() => {
      document.dispatchEvent(new MouseEvent("pointerup"));
    });
    expect(result.current.draggingId).toBeNull();
    expect(onReorder).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("reverts to the items prop order once the drag ends (until the parent updates items)", () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragReorder(items, onReorder));

    const elC = document.querySelector('[data-drag-id="c"]') as HTMLElement;
    document.elementFromPoint = jest.fn().mockReturnValue(elC);

    act(() => {
      result.current.dragHandleProps("a").onPointerDown(makePointerDownEvent());
    });
    act(() => {
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10 }));
      document.dispatchEvent(new MouseEvent("pointerup"));
    });

    expect(result.current.displayItems).toEqual(items);
  });

  it("translates the dragged element so it visually follows the pointer", () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragReorder(items, onReorder));

    const elA = document.querySelector('[data-drag-id="a"]') as HTMLElement;
    // jsdom はレイアウトを計算しないため、要素の位置を固定値でスタブする
    elA.getBoundingClientRect = jest.fn().mockReturnValue({ top: 100 } as DOMRect);
    document.elementFromPoint = jest.fn().mockReturnValue(elA);

    act(() => {
      result.current.dragHandleProps("a").onPointerDown({
        preventDefault: jest.fn(),
        button: 0,
        pointerType: "mouse",
        clientY: 110,
        currentTarget: elA,
      } as unknown as React.PointerEvent);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 150 }));
    });
    // grabOffsetY = 110 - 100 = 10、translateY = 150 - 10 - 100 = 40
    expect(elA.style.transform).toBe("translateY(40px)");

    act(() => {
      document.dispatchEvent(new MouseEvent("pointerup"));
    });
    expect(elA.style.transform).toBe("");
  });

  it("does nothing when the pointer moves over an unknown target", () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragReorder(items, onReorder));
    document.elementFromPoint = jest.fn().mockReturnValue(document.body);

    act(() => {
      result.current.dragHandleProps("a").onPointerDown(makePointerDownEvent());
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10 }));
    });
    expect(result.current.displayItems.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
