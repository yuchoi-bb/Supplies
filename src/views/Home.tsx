import { useRef, useState, type ChangeEvent } from 'react';
import type { AppData, PackList, Template } from '../types';
import {
  duplicateTemplate,
  emptyTemplate,
  listFromTemplates,
  listProgress,
  marathonExtraSections,
} from '../types';
import { exportBackup, parseBackup } from '../backup';

interface Props {
  templates: Template[];
  lists: PackList[];
  onOpenTemplate: (id: string) => void;
  onOpenList: (id: string) => void;
  onCreateTemplate: (t: Template) => void;
  onCreateList: (l: PackList) => void;
  onApplyImport: (data: AppData, replace: boolean) => void;
}

export function Home({
  templates,
  lists,
  onOpenTemplate,
  onOpenList,
  onCreateTemplate,
  onCreateList,
  onApplyImport,
}: Props) {
  const [creatingList, setCreatingList] = useState(false);
  const [listName, setListName] = useState('');
  const [baseTemplateIds, setBaseTemplateIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportNow() {
    try {
      await exportBackup({ templates, lists });
    } catch {
      alert('백업 내보내기에 실패했습니다.');
    }
  }

  function pickImportFile() {
    fileRef.current?.click();
  }

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseBackup(text);
      const replace = confirm(
        `백업에 준비물 ${data.lists.length}개, 기본 준비물 ${data.templates.length}개가 있어요.\n\n확인=기존을 모두 지우고 교체\n취소=기존에 합치기`
      );
      onApplyImport(data, replace);
    } catch {
      alert('백업 파일을 읽지 못했습니다. 올바른 백업(JSON)인지 확인해 주세요.');
    }
  }

  function toggleBase(id: string) {
    setBaseTemplateIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  // 선택한 기본 준비물들(선택 순서대로)로 준비물을 만든다. 0개면 빈 준비물.
  function createList() {
    const name = listName.trim();
    if (!name) return;
    const bases = baseTemplateIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is Template => !!t);
    const l = listFromTemplates(bases, name);
    onCreateList(l);
    setListName('');
    setBaseTemplateIds([]);
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

  // "마라톤"에 착용/대회용 작은가방/큰 가방 묶음을 불러온다. (폰에 저장된 기존 마라톤에도 반영)
  function loadMarathonExtras() {
    const extra = marathonExtraSections();
    const existing = templates.find((t) => t.name === '마라톤');
    if (existing) {
      const have = new Set(existing.sections.map((s) => s.title));
      const toAdd = extra.filter((s) => !have.has(s.title));
      if (toAdd.length === 0) {
        alert('이미 최신 마라톤 항목(착용·대회용 작은가방·큰 가방)이 들어 있어요.');
        return;
      }
      onCreateTemplate({ ...existing, sections: [...existing.sections, ...toAdd] });
      onOpenTemplate(existing.id);
    } else {
      const t = emptyTemplate('마라톤');
      onCreateTemplate({ ...t, sections: extra });
      onOpenTemplate(t.id);
    }
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
              placeholder="이름 (예: 8월 호주여행)"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createList()}
              autoFocus
            />
            <div className="base-pick">
              <span className="muted">
                기본 준비물 선택 (여러 개 가능 · 선택 안 하면 빈 준비물)
              </span>
              {templates.map((t) => {
                const order = baseTemplateIds.indexOf(t.id);
                return (
                  <label
                    key={t.id}
                    className={'base-pick-row' + (order >= 0 ? ' selected' : '')}
                  >
                    <input
                      type="checkbox"
                      checked={order >= 0}
                      onChange={() => toggleBase(t.id)}
                    />
                    <span className="base-pick-name">{t.name}</span>
                    {order >= 0 && baseTemplateIds.length > 1 && (
                      <span className="base-pick-order">{order + 1}</span>
                    )}
                  </label>
                );
              })}
            </div>
            <button className="btn btn-primary" onClick={createList} disabled={!listName.trim()}>
              만들기
              {baseTemplateIds.length > 1 ? ` (기본 준비물 ${baseTemplateIds.length}개)` : ''}
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
            const p = listProgress(l);
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
        <button
          className="btn btn-wide"
          onClick={loadMarathonExtras}
          title="마라톤에 착용·대회용 작은가방·큰 가방 묶음을 넣어요"
        >
          📥 기본 마라톤 항목 불러오기 (착용·작은가방·큰가방)
        </button>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>백업 · 동기화</h2>
        </div>
        <div className="backup-row">
          <button className="btn" onClick={exportNow}>
            ⬆️ 백업 내보내기
          </button>
          <button className="btn" onClick={pickImportFile}>
            ⬇️ 백업 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={onFileChosen}
          />
        </div>
        <p className="muted">
          내보내기: 준비물 전체를 파일로 저장해요(안드로이드는 공유로 Google Drive에 저장 가능). 다른
          폰에서 "가져오기"로 그대로 불러올 수 있어요. Google 로그인을 켜면 여러 기기가 자동으로
          실시간 동기화됩니다.
        </p>
      </section>
    </div>
  );
}
