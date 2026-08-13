import { useState } from 'react';
import type { PackList, Template } from '../types';
import { duplicateTemplate, emptyList, emptyTemplate, listFromTemplate } from '../types';

interface Props {
  templates: Template[];
  lists: PackList[];
  onOpenTemplate: (id: string) => void;
  onOpenList: (id: string) => void;
  onCreateTemplate: (t: Template) => void;
  onCreateList: (l: PackList) => void;
}

export function Home({
  templates,
  lists,
  onOpenTemplate,
  onOpenList,
  onCreateTemplate,
  onCreateList,
}: Props) {
  const [creatingList, setCreatingList] = useState(false);
  const [listName, setListName] = useState('');
  const [baseTemplateId, setBaseTemplateId] = useState('');

  function createList() {
    const name = listName.trim();
    if (!name) return;
    const base = templates.find((t) => t.id === baseTemplateId);
    const l = base ? listFromTemplate(base, name) : emptyList(name);
    onCreateList(l);
    setListName('');
    setBaseTemplateId('');
    setCreatingList(false);
    onOpenList(l.id);
  }

  function createTemplate() {
    const name = prompt('새 기본 준비물 이름 (예: 마라톤, 자전거대회, 캠핑)');
    if (!name || !name.trim()) return;
    const t = emptyTemplate(name.trim());
    onCreateTemplate(t);
    onOpenTemplate(t.id);
  }

  // 기본 준비물(주제) 전체를 통째로 복사해 새 기본 준비물을 만든다.
  // 예: "마라톤"을 복사해 "트레일러닝대회"로.
  function copyTemplate(source: Template) {
    const name = prompt(
      `"${source.name}"을(를) 복사해서 만들 새 기본 준비물 이름`,
      `${source.name} 복사`
    );
    if (!name || !name.trim()) return;
    const t = duplicateTemplate(source, name.trim());
    onCreateTemplate(t);
    onOpenTemplate(t.id);
  }

  function progress(l: PackList): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const s of l.sections)
      for (const it of s.items) {
        total++;
        if (it.checked) done++;
      }
    return { done, total };
  }

  return (
    <div>
      <section className="block">
        <div className="block-head">
          <h2>내 준비물</h2>
          <button className="btn btn-primary" onClick={() => setCreatingList((v) => !v)}>
            + 새 준비물
          </button>
        </div>
        {creatingList && (
          <div className="card form-card">
            <input
              className="input"
              placeholder="이름 (예: 서울마라톤 준비물)"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createList()}
              autoFocus
            />
            <select
              className="input"
              value={baseTemplateId}
              onChange={(e) => setBaseTemplateId(e.target.value)}
            >
              <option value="">기본 준비물 없이 시작</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  기본: {t.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={createList} disabled={!listName.trim()}>
              만들기
            </button>
          </div>
        )}
        {lists.length === 0 && !creatingList && (
          <p className="muted">
            아직 준비물이 없어요. 기본 준비물을 골라 새 준비물을 만들어 보세요.
          </p>
        )}
        <ul className="cards">
          {lists.map((l) => {
            const p = progress(l);
            return (
              <li key={l.id}>
                <button className="card row-card" onClick={() => onOpenList(l.id)}>
                  <div className="row-main">
                    <span className="row-title">{l.name}</span>
                    {l.templateName && <span className="tag">기본: {l.templateName}</span>}
                  </div>
                  <span className={'progress' + (p.total > 0 && p.done === p.total ? ' done' : '')}>
                    {p.done}/{p.total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>기본 준비물</h2>
          <button className="btn" onClick={createTemplate}>
            + 새 기본 준비물
          </button>
        </div>
        {templates.length === 0 && <p className="muted">기본 준비물을 만들어 보세요.</p>}
        <ul className="cards">
          {templates.map((t) => {
            const count = t.sections.reduce((n, s) => n + s.items.length, 0);
            return (
              <li key={t.id} className="template-row">
                <button className="card row-card" onClick={() => onOpenTemplate(t.id)}>
                  <div className="row-main">
                    <span className="row-title">{t.name}</span>
                  </div>
                  <span className="muted">{count}개 항목</span>
                </button>
                <button
                  className="btn btn-sm copy-template-btn"
                  onClick={() => copyTemplate(t)}
                  title="이 주제 전체를 복사해 새 기본 준비물 만들기"
                >
                  복사
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
