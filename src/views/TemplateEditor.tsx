import { useState } from 'react';
import type { Item, Section, Template } from '../types';
import { sectionLabel, uid } from '../types';

interface Props {
  template: Template;
  otherTemplates: Template[];
  onChange: (t: Template) => void;
  // 항목을 다른 기본 준비물로 복사할 때, 변경된 대상 템플릿을 저장한다.
  onCopyToTemplate: (target: Template) => void;
  onDelete: () => void;
  onBack: () => void;
}

export function TemplateEditor({
  template,
  otherTemplates,
  onChange,
  onCopyToTemplate,
  onDelete,
  onBack,
}: Props) {
  const [newItemName, setNewItemName] = useState<Record<string, string>>({});

  function update(sections: Section[]) {
    onChange({ ...template, sections });
  }

  function rename() {
    const name = prompt('기본 준비물 이름', template.name);
    if (name && name.trim()) onChange({ ...template, name: name.trim() });
  }

  function addSection() {
    const title = prompt('대제목 (예: 의류, 용품)');
    if (title === null) return;
    update([...template.sections, { id: uid(), title: title.trim(), items: [] }]);
  }

  function renameSection(s: Section) {
    const title = prompt('대제목 수정 (비우면 제목 없는 묶음이 됩니다)', s.title);
    if (title === null) return;
    update(
      template.sections.map((x) => (x.id === s.id ? { ...x, title: title.trim() } : x))
    );
  }

  function deleteSection(s: Section) {
    if (s.items.length > 0 && !confirm(`"${sectionLabel(s.title)}" 묶음과 항목 ${s.items.length}개를 삭제할까요?`))
      return;
    update(template.sections.filter((x) => x.id !== s.id));
  }

  function addItem(s: Section) {
    const name = (newItemName[s.id] || '').trim();
    if (!name) return;
    update(
      template.sections.map((x) =>
        x.id === s.id ? { ...x, items: [...x.items, { id: uid(), name }] } : x
      )
    );
    setNewItemName((m) => ({ ...m, [s.id]: '' }));
  }

  function renameItem(s: Section, it: Item) {
    const name = prompt('항목 이름', it.name);
    if (!name || !name.trim()) return;
    update(
      template.sections.map((x) =>
        x.id === s.id
          ? { ...x, items: x.items.map((y) => (y.id === it.id ? { ...y, name: name.trim() } : y)) }
          : x
      )
    );
  }

  function deleteItem(s: Section, it: Item) {
    update(
      template.sections.map((x) =>
        x.id === s.id ? { ...x, items: x.items.filter((y) => y.id !== it.id) } : x
      )
    );
  }

  // "가" 대제목의 항목을 "나" 대제목으로 이동
  function moveItem(from: Section, it: Item, toSectionId: string) {
    if (toSectionId === from.id) return;
    update(
      template.sections.map((x) => {
        if (x.id === from.id) return { ...x, items: x.items.filter((y) => y.id !== it.id) };
        if (x.id === toSectionId) return { ...x, items: [...x.items, it] };
        return x;
      })
    );
  }

  // 항목을 다른 기본 준비물(예: 자전거대회)로 복사
  function copyItem(from: Section, it: Item, targetTemplateId: string) {
    const target = otherTemplates.find((t) => t.id === targetTemplateId);
    if (!target) return;
    if (target.sections.some((s) => s.items.some((y) => y.name === it.name))) {
      alert(`"${target.name}"에 이미 "${it.name}" 항목이 있어요.`);
      return;
    }
    const newItem = { id: uid(), name: it.name };
    const match = target.sections.find((s) => s.title === from.title);
    let sections: Section[];
    if (match) {
      sections = target.sections.map((s) =>
        s.id === match.id ? { ...s, items: [...s.items, newItem] } : s
      );
    } else if (target.sections.length > 0 && from.title.trim() === '') {
      const first = target.sections[0];
      sections = target.sections.map((s) =>
        s.id === first.id ? { ...s, items: [...s.items, newItem] } : s
      );
    } else {
      sections = [...target.sections, { id: uid(), title: from.title, items: [newItem] }];
    }
    onCopyToTemplate({ ...target, sections });
    alert(`"${it.name}" 항목을 "${target.name}"에 추가했어요.`);
  }

  return (
    <div>
      <div className="page-head">
        <button className="btn btn-ghost" onClick={onBack}>
          ← 뒤로
        </button>
        <h2 className="page-title" onClick={rename} title="눌러서 이름 수정">
          {template.name} <span className="edit-hint">✏️</span>
        </h2>
        <button
          className="btn btn-danger"
          onClick={() => confirm(`"${template.name}" 기본 준비물을 삭제할까요?`) && onDelete()}
        >
          삭제
        </button>
      </div>
      <p className="muted">
        기본 준비물 양식입니다. 여기서 고친 내용은 앞으로 이 양식으로 만드는 준비물에 적용돼요.
      </p>

      {template.sections.map((s) => (
        <section className="card section-card" key={s.id}>
          <div className="section-head">
            <h3 className={s.title.trim() === '' ? 'muted' : ''} onClick={() => renameSection(s)}>
              {sectionLabel(s.title)} <span className="edit-hint">✏️</span>
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => deleteSection(s)}>
              묶음 삭제
            </button>
          </div>
          <ul className="items">
            {s.items.map((it) => (
              <li className="item-row" key={it.id}>
                <span className="item-name" onClick={() => renameItem(s, it)}>
                  {it.name}
                </span>
                <span className="item-actions">
                  {template.sections.length > 1 && (
                    <select
                      className="mini-select"
                      value=""
                      onChange={(e) => moveItem(s, it, e.target.value)}
                      title="다른 대제목으로 이동"
                    >
                      <option value="" disabled>
                        이동
                      </option>
                      {template.sections
                        .filter((x) => x.id !== s.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            → {sectionLabel(x.title)}
                          </option>
                        ))}
                    </select>
                  )}
                  {otherTemplates.length > 0 && (
                    <select
                      className="mini-select"
                      value=""
                      onChange={(e) => copyItem(s, it, e.target.value)}
                      title="다른 기본 준비물에 추가"
                    >
                      <option value="" disabled>
                        복사
                      </option>
                      {otherTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          → {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(s, it)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="add-row">
            <input
              className="input"
              placeholder="소제목(항목) 추가"
              value={newItemName[s.id] || ''}
              onChange={(e) => setNewItemName((m) => ({ ...m, [s.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addItem(s)}
            />
            <button className="btn" onClick={() => addItem(s)}>
              추가
            </button>
          </div>
        </section>
      ))}

      <button className="btn btn-wide" onClick={addSection}>
        + 대제목 추가
      </button>
    </div>
  );
}
