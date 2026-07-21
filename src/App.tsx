import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseEnabled, signInWithGoogle, signOut } from './firebase';
import { CloudRepo, LocalRepo, type Repo } from './storage';
import type { AppData, PackList, Template } from './types';
import { seedTemplates } from './types';
import { Home } from './views/Home';
import { TemplateEditor } from './views/TemplateEditor';
import { ListEditor } from './views/ListEditor';

type View =
  | { kind: 'home' }
  | { kind: 'template'; id: string }
  | { kind: 'list'; id: string };

const SEED_FLAG = 'supplies-seeded-v1';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<PackList[]>([]);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot(r: Repo) {
      setLoading(true);
      try {
        let data: AppData = await r.loadAll();
        // 클라우드가 비어 있고 기기에 데이터가 있으면 계정으로 올린다.
        if (r instanceof CloudRepo && data.templates.length === 0 && data.lists.length === 0) {
          const local = new LocalRepo();
          const localData = await local.loadAll();
          if (localData.templates.length > 0 || localData.lists.length > 0) {
            await Promise.all([
              ...localData.templates.map((t) => r.saveTemplate(t)),
              ...localData.lists.map((l) => r.saveList(l)),
            ]);
            local.clear();
            data = localData;
          }
        }
        // 완전히 처음이면 예시 템플릿을 넣어준다.
        if (
          data.templates.length === 0 &&
          data.lists.length === 0 &&
          !localStorage.getItem(SEED_FLAG)
        ) {
          const seeds = seedTemplates();
          await Promise.all(seeds.map((t) => r.saveTemplate(t)));
          localStorage.setItem(SEED_FLAG, '1');
          data = { templates: seeds, lists: [] };
        }
        setTemplates(data.templates);
        setLists(data.lists);
        setRepo(r);
        setError(null);
      } catch (e) {
        console.error(e);
        setError('데이터를 불러오지 못했습니다. 네트워크를 확인해 주세요.');
      } finally {
        setLoading(false);
      }
    }

    if (!firebaseEnabled || !auth) {
      boot(new LocalRepo());
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setView({ kind: 'home' });
      boot(u ? new CloudRepo(u.uid) : new LocalRepo());
    });
  }, []);

  function upsertTemplate(t: Template) {
    const next = { ...t, updatedAt: Date.now() };
    setTemplates((ts) => {
      const i = ts.findIndex((x) => x.id === next.id);
      if (i >= 0) return ts.map((x) => (x.id === next.id ? next : x));
      return [...ts, next];
    });
    repo?.saveTemplate(next).catch(() => setError('저장에 실패했습니다.'));
  }

  function removeTemplate(id: string) {
    setTemplates((ts) => ts.filter((x) => x.id !== id));
    repo?.deleteTemplate(id).catch(() => setError('삭제에 실패했습니다.'));
    setView({ kind: 'home' });
  }

  function upsertList(l: PackList) {
    const next = { ...l, updatedAt: Date.now() };
    setLists((ls) => {
      const i = ls.findIndex((x) => x.id === next.id);
      if (i >= 0) return ls.map((x) => (x.id === next.id ? next : x));
      return [next, ...ls];
    });
    repo?.saveList(next).catch(() => setError('저장에 실패했습니다.'));
  }

  function removeList(id: string) {
    setLists((ls) => ls.filter((x) => x.id !== id));
    repo?.deleteList(id).catch(() => setError('삭제에 실패했습니다.'));
    setView({ kind: 'home' });
  }

  const currentTemplate = useMemo(
    () => (view.kind === 'template' ? templates.find((t) => t.id === view.id) : undefined),
    [view, templates]
  );
  const currentList = useMemo(
    () => (view.kind === 'list' ? lists.find((l) => l.id === view.id) : undefined),
    [view, lists]
  );

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView({ kind: 'home' })}>
          🎒 준비물
        </button>
        <div className="auth">
          {firebaseEnabled ? (
            user ? (
              <>
                <span className="auth-email">{user.email}</span>
                <button className="btn btn-ghost" onClick={() => signOut()}>
                  로그아웃
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => signInWithGoogle().catch(() => setError('로그인에 실패했습니다.'))}
              >
                Google 로그인
              </button>
            )
          ) : (
            <span className="auth-email">기기 저장 모드</span>
          )}
        </div>
      </header>

      {firebaseEnabled && !user && !loading && (
        <div className="banner">
          Google 계정으로 로그인하면 준비물이 계정에 저장되어, 앱을 다시 설치하거나 다른 기기에서도
          그대로 불러올 수 있어요.
        </div>
      )}
      {error && (
        <div className="banner banner-error" onClick={() => setError(null)}>
          {error} (눌러서 닫기)
        </div>
      )}

      <main className="content">
        {loading ? (
          <p className="muted center">불러오는 중…</p>
        ) : view.kind === 'home' ? (
          <Home
            templates={templates}
            lists={lists}
            onOpenTemplate={(id) => setView({ kind: 'template', id })}
            onOpenList={(id) => setView({ kind: 'list', id })}
            onCreateTemplate={upsertTemplate}
            onCreateList={upsertList}
          />
        ) : view.kind === 'template' && currentTemplate ? (
          <TemplateEditor
            template={currentTemplate}
            otherTemplates={templates.filter((t) => t.id !== currentTemplate.id)}
            onChange={upsertTemplate}
            onCopyToTemplate={(target) => upsertTemplate(target)}
            onDelete={() => removeTemplate(currentTemplate.id)}
            onBack={() => setView({ kind: 'home' })}
          />
        ) : view.kind === 'list' && currentList ? (
          <ListEditor
            list={currentList}
            sourceTemplate={
              currentList.templateId
                ? templates.find((t) => t.id === currentList.templateId)
                : undefined
            }
            onChange={upsertList}
            onTemplateChange={upsertTemplate}
            onDelete={() => removeList(currentList.id)}
            onBack={() => setView({ kind: 'home' })}
          />
        ) : (
          <p className="muted center">항목을 찾을 수 없습니다.</p>
        )}
      </main>
    </div>
  );
}
