import { useState, type ReactNode } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 항목(소제목) 끌어다 놓기. 손잡이(⠿)로만 잡히게 해서 체크/이름 클릭과 겹치지 않는다.
// 마우스는 4px 움직이면, 터치는 살짝 길게 누르면 끌기가 시작된다.

const SECTION_PREFIX = 'section:';

interface HasItems<I> {
  id: string;
  items: I[];
}

// 편집 화면 전체를 감싸는 끌기 영역. sections에는 화면의 모든 묶음(블록 안 묶음 포함)을 넘긴다.
// 놓으면 바뀐 묶음들의 새 항목 배열을 onMove로 돌려준다.
export function ItemDnd<I extends { id: string; name: string }>({
  sections,
  onMove,
  children,
}: {
  sections: HasItems<I>[];
  onMove: (changed: Map<string, I[]>) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeName, setActiveName] = useState<string | null>(null);

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    for (const s of sections) {
      const it = s.items.find((x) => x.id === id);
      if (it) setActiveName(it.name);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveName(null);
    if (!e.over) return;
    const changed = computeMove(sections, String(e.active.id), String(e.over.id));
    if (changed) onMove(changed);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveName(null)}
    >
      <div className={activeName ? 'dnd-active' : undefined}>{children}</div>
      <DragOverlay>
        {activeName ? <div className="drag-overlay">⠿ {activeName}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

// 끌어 놓은 결과 계산: 같은 묶음이면 순서만, 다른 묶음이면 빼서 넣는다.
export function computeMove<I extends { id: string }>(
  sections: HasItems<I>[],
  activeId: string,
  overId: string
): Map<string, I[]> | null {
  if (activeId === overId) return null;
  const from = sections.find((s) => s.items.some((i) => i.id === activeId));
  if (!from) return null;
  const fromIndex = from.items.findIndex((i) => i.id === activeId);

  let to: HasItems<I> | undefined;
  let toIndex: number;
  if (overId.startsWith(SECTION_PREFIX)) {
    to = sections.find((s) => s.id === overId.slice(SECTION_PREFIX.length));
    if (!to) return null;
    toIndex = to.items.length; // 묶음 빈 곳에 놓으면 맨 끝으로
  } else {
    to = sections.find((s) => s.items.some((i) => i.id === overId));
    if (!to) return null;
    toIndex = to.items.findIndex((i) => i.id === overId);
  }

  const changed = new Map<string, I[]>();
  if (from.id === to.id) {
    if (fromIndex === toIndex) return null;
    changed.set(from.id, arrayMove(from.items, fromIndex, toIndex));
    return changed;
  }
  const moving = from.items[fromIndex];
  const toItems = [...to.items];
  toItems.splice(toIndex, 0, moving);
  changed.set(from.id, from.items.filter((i) => i.id !== activeId));
  changed.set(to.id, toItems);
  return changed;
}

// 한 묶음의 항목 목록. 비어 있어도 그 묶음에 놓을 수 있다.
export function SortableItems({
  sectionId,
  itemIds,
  children,
}: {
  sectionId: string;
  itemIds: string[];
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SECTION_PREFIX + sectionId });
  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className={'items' + (isOver ? ' drop-over' : '')}>
        {children}
      </ul>
    </SortableContext>
  );
}

// 끌 수 있는 항목 한 줄 (왼쪽에 ⠿ 손잡이)
export function SortableItemRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={'item-row' + (isDragging ? ' dragging' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="drag-handle"
        aria-label="끌어서 옮기기"
        title="끌어서 옮기기"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {children}
    </li>
  );
}
