import { useState } from 'react';
import type { CheckItem, CheckSection, PackList, Section, Template } from '../types';
import { sectionLabel, uid } from '../types';

interface Props {
  list: PackList;
  sourceTemplate?: Template;
  onChange: (l: PackList) => void;
  onTemplateChange: (t: Template) => void;
  onDelete: () => void;
  onBack: () => void;
}

export function ListEditor({
  list,
  sourceTemplate,
  onChange,
  onTemplateChange,
  onDelete,
  onBack,
}: Props) {
  const [newItemName, setNewItemName] = useState<Record<string, string>>({});
  // 섹션별 "기본 준비물에도 추가" 체크 상태
  const [alsoTemplate, setAlsoTemplate] = useState<Record<string, boolean>>({});
  const subtopics = list.subtopics ?? [];

  const countAll = (sections: CheckSection[]) =>
    sections.reduce((n, s) => n + s.items.length, 0);
  const countDone = (sections: CheckSection[]) =>
    sections.reduce((n, s) => n + s.items.filter((i) => i.checked).length, 0);

  const total =
    countAll(list.sections) + subtopics.reduce((n, st) => n + countAll(st.sections), 0);
  const done =
    countDone(list.sections) + subtopics.reduce((n, st) => n + countDone(st.sections), 0);

  // subId가 없으면 최상위 묶음, 있으면 해당 하위 주제의 묶음을 다룬다.
  function getContainer(subId?: string): CheckSection[] {
    if (!subId) return list.sections;
    return subtopics.find((st) => st.id === subId)?.sections ?? [];
  }

  function setContainer(subId: string | undefined, sections: CheckSection[]) {
    if (!subId) {
      onChange({ ...list, sections });
      return;
    }
    onChange({
      ...list,
      subtopics: subtopics.map((st) => (st.id === subId ? { ...st, sections } : st)),
    });
  }

  function rename() {
    const name = prompt('준비물 이름', list.name);
    if (name && name.trim()) onChange({ ...list, name: name.trim() });
  }

  function toggle(subId: string | undefined, s: CheckSection, it: CheckItem) {
    setContainer(
      subId,
      getContainer(subId).map((x) =>
        x.id === s.id
          ? { ...x, items: x.items.map((y) => (y.id === it.id ? { ...y, checked: !y.checked } : y)) }
          : x
      )
    );
  }

  function addSection(subId?: string) {
    const title = prompt('대제목 (예: 의류, 용품)');
    if (title === null) return;
    setContainer(subId, [...getContainer(subId), { id: uid(), title: title.trim(), items: [] }]);
  }

  function renameSection(subId: string | undefined, s: CheckSection) {
    const title = prompt('대제목 수정 (비우면 제목 없는 묶음이 됩니다)', s.title);
    if (title === null) return;
    setContainer(
      subId,
      getContainer(subId).map((x) => (x.id === s.id ? { ...x, title: title.trim() } : x))
    );
  }

  function deleteSection(subId: string | undefined, s: CheckSection) {
    if (
      s.items.length > 0 &&
      !confirm(`"${sectionLabel(s.title)}" 묶음과 항목 ${s.items.length}개를 삭제할까요?`)
    )
      return;
    setContainer(
      subId,
      getContainer(subId).filter((x) => x.id !== s.id)
    );
  }

  // 항목 추가. 최상위 묶음에서 "기본 준비물에도 추가"가 켜져 있으면 원본 템플릿에도 같이 추가한다.
  function addItem(subId: string | undefined, s: CheckSection) {
    const name = (newItemName[s.id] || '').trim();
    if (!name) return;
    setContainer(
      subId,
      getContainer(subId).map((x) =>
        x.id === s.id ? { ...x, items: [...x.items, { id: uid(), name, checked: false }] } : x
      )
    );
    setNewItemName((m) => ({ ...m, [s.id]: '' }));

    if (!subId && alsoTemplate[s.id] && sourceTemplate) {
      addToTemplate(sourceTemplate, s.title, name);
    }
  }

  function addToTemplate(template: Template, sectionTitle: string, name: string) {
    if (template.sections.some((ts) => ts.items.some((y) => y.name === name))) return;
    const newItem = { id: uid(), name };
    const match = template.sections.find((ts) => ts.title === sectionTitle);
    let sections: Section[];
    if (match) {
      sections = template.sections.map((ts) =>
        ts.id === match.id ? { ...ts, items: [...ts.items, newItem] } : ts
      );
    } else {
      sections = [...template.sections, { id: uid(), title: sectionTitle, items: [newItem] }];
    }
    onTemplateChange({ ...template, sections });
  }

  function deleteItem(subId: string | undefined, s: CheckSection, it: CheckItem) {
    setContainer(
      subId,
      getContainer(subId).map((x) =>
        x.id === s.id ? { ...x, items: x.items.filter((y) => y.id !== it.id) } : x
      )
    );
  }

  function moveItem(subId: string | undefined, from: CheckSection, it: CheckItem, toSectionId: string) {
    if (toSectionId === from.id) return;
    setContainer(
      subId,
      getContainer(subId).map((x) => {
        if (x.id === from.id) return { ...x, items: x.items.filter((y) => y.id !== it.id) };
        if (x.id === toSectionId) return { ...x, items: [...x.items, it] };
        return x;
      })
    );
  }

  function deleteSubtopic(subId: string) {
    const st = subtopics.find((x) => x.id === subId);
    if (!st) return;
    if (!confirm(`하위 주제 "${st.name}"을(를) 통째로 삭제할까요?`)) return;
    onChange({ ...list, subtopics: subtopics.filter((x) => x.id !== subId) });
  }

  function resetChecks() {
    if (!confirm('모든 체크를 해제할까요?')) return;
    const clear = (sections: CheckSection[]) =>
      sections.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it, checked: false })) }));
    onChange({
      ...list,
      sections: clear(list.sections),
      subtopics: subtopics.map((st) => ({ ...st, sections: clear(st.sections) })),
    });
  }

  function sectionCard(s: CheckSection, subId?: string) {
    const container = getContainer(subId);
    return (
      <section className="card section-card" key={s.id}>
        <div className="section-head">
          <h3
            className={s.title.trim() === '' ? 'muted' : ''}
            onClick={() => renameSection(subId, s)}
          >
            {sectionLabel(s.title)} <span className="edit-hint">✏️</span>
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => deleteSection(subId, s)}>
            묶음 삭제
          </button>
        </div>
        <ul className="items">
          {s.items.map((it) => (
            <li className="item-row" key={it.id}>
              <label className={'check-label' + (it.checked ? ' checked' : '')}>
                <input type="checkbox" checked={it.checked} onChange={() => toggle(subId, s, it)} />
                <span>{it.name}</span>
              </label>
              <span className="item-actions">
                {container.length > 1 && (
                  <select
                    className="mini-select"
                    value=""
                    onChange={(e) => moveItem(subId, s, it, e.target.value)}
                    title="다른 대제목으로 이동"
                  >
                    <option value="" disabled>
                      이동
                    </option>
                    {container
                      .filter((x) => x.id !== s.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          → {sectionLabel(x.title)}
                        </option>
                      ))}
                  </select>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(subId, s, it)}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="add-row">
          <input
            className="input"
            placeholder="항목 추가 (예: 양말)"
            value={newItemName[s.id] || ''}
            onChange={(e) => setNewItemName((m) => ({ ...m, [s.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addItem(subId, s)}
          />
          <button className="btn" onClick={() => addItem(subId, s)}>
            추가
          </button>
        </div>
        {!subId && sourceTemplate && (
          <label className="also-template">
            <input
              type="checkbox"
              checked={!!alsoTemplate[s.id]}
              onChange={(e) => setAlsoTemplate((m) => ({ ...m, [s.id]: e.target.checked }))}
            />
            기본 준비물 "{sourceTemplate.name}"에도 함께 추가
          </label>
        )}
      </section>
    );
  }

  return (
    <div>
      <div className="page-head">
        <button className="btn btn-ghost" onClick={onBack}>
          ← 뒤로
        </button>
        <h2 className="page-title" onClick={rename} title="눌러서 이름 수정">
          {list.name} <span className="edit-hint">✏️</span>
        </h2>
        <button
          className="btn btn-danger"
          onClick={() => confirm(`"${list.name}" 준비물을 삭제할까요?`) && onDelete()}
        >
          삭제
        </button>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
          />
        </div>
        <span className={'progress' + (total > 0 && done === total ? ' done' : '')}>
          {done}/{total}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={resetChecks}>
          체크 초기화
        </button>
      </div>
      {list.templateName && (
        <p className="muted">
          기본 준비물 "{list.templateName}"에서 만들었어요.
          {sourceTemplate
            ? ' 항목을 추가할 때 기본 준비물에도 함께 추가할 수 있어요.'
            : ' (원본 기본 준비물은 삭제되었어요.)'}
        </p>
      )}

      {list.sections.map((s) => sectionCard(s))}

      <button className="btn btn-wide" onClick={() => addSection()}>
        + 대제목 추가
      </button>

      {subtopics.map((st) => {
        const stTotal = countAll(st.sections);
        const stDone = countDone(st.sections);
        return (
          <div className="subtopic-card" key={st.id}>
            <div className="subtopic-head">
              <h3 className="subtopic-title">
                📦 {st.name}
                <span className={'progress' + (stTotal > 0 && stDone === stTotal ? ' done' : '')}>
                  {stDone}/{stTotal}
                </span>
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => deleteSubtopic(st.id)}>
                하위 주제 삭제
              </button>
            </div>
            {st.sections.map((s) => sectionCard(s, st.id))}
            <button className="btn btn-wide" onClick={() => addSection(st.id)}>
              + 대제목 추가
            </button>
          </div>
        );
      })}
    </div>
  );
}
