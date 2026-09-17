import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AppData, PackList, Template } from './types';

export interface Repo {
  loadAll(): Promise<AppData>;
  saveTemplate(t: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  saveList(l: PackList): Promise<void>;
  deleteList(id: string): Promise<void>;
  // 전체 교체 (백업 복원용)
  replaceAll(data: AppData): Promise<void>;
  // 실시간 구독 (다기기 동기화). 지원하지 않으면 생략.
  subscribe?(onData: (data: AppData) => void): () => void;
}

const LOCAL_KEY = 'supplies-data-v1';

// 로그인하지 않았을 때(또는 Firebase 미설정 시) 기기에만 저장하는 저장소
export class LocalRepo implements Repo {
  private read(): AppData {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch {
      // 손상된 데이터는 무시하고 초기화
    }
    return { templates: [], lists: [] };
  }

  private write(data: AppData): void {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }

  async loadAll(): Promise<AppData> {
    return this.read();
  }

  async saveTemplate(t: Template): Promise<void> {
    const data = this.read();
    const i = data.templates.findIndex((x) => x.id === t.id);
    if (i >= 0) data.templates[i] = t;
    else data.templates.push(t);
    this.write(data);
  }

  async deleteTemplate(id: string): Promise<void> {
    const data = this.read();
    data.templates = data.templates.filter((x) => x.id !== id);
    this.write(data);
  }

  async saveList(l: PackList): Promise<void> {
    const data = this.read();
    const i = data.lists.findIndex((x) => x.id === l.id);
    if (i >= 0) data.lists[i] = l;
    else data.lists.push(l);
    this.write(data);
  }

  async deleteList(id: string): Promise<void> {
    const data = this.read();
    data.lists = data.lists.filter((x) => x.id !== id);
    this.write(data);
  }

  async replaceAll(data: AppData): Promise<void> {
    this.write({ templates: data.templates, lists: data.lists });
  }

  hasData(): boolean {
    const d = this.read();
    return d.templates.length > 0 || d.lists.length > 0;
  }

  clear(): void {
    localStorage.removeItem(LOCAL_KEY);
  }
}

// Google 로그인 시 Firestore(users/{uid}/...)에 저장하는 저장소.
// 계정에 묶여 있어서 앱을 지웠다 다시 설치해도 로그인만 하면 복원된다.
export class CloudRepo implements Repo {
  constructor(private userId: string) {}

  private col(name: 'templates' | 'lists') {
    if (!db) throw new Error('Firestore not initialized');
    return collection(db, 'users', this.userId, name);
  }

  async loadAll(): Promise<AppData> {
    const [tSnap, lSnap] = await Promise.all([
      getDocs(this.col('templates')),
      getDocs(this.col('lists')),
    ]);
    const templates = tSnap.docs.map((d) => d.data() as Template);
    const lists = lSnap.docs.map((d) => d.data() as PackList);
    templates.sort((a, b) => a.createdAt - b.createdAt);
    lists.sort((a, b) => b.createdAt - a.createdAt);
    return { templates, lists };
  }

  async saveTemplate(t: Template): Promise<void> {
    await setDoc(doc(this.col('templates'), t.id), t);
  }

  async deleteTemplate(id: string): Promise<void> {
    await deleteDoc(doc(this.col('templates'), id));
  }

  async saveList(l: PackList): Promise<void> {
    await setDoc(doc(this.col('lists'), l.id), l);
  }

  async deleteList(id: string): Promise<void> {
    await deleteDoc(doc(this.col('lists'), id));
  }

  // 기존 문서를 모두 지우고 백업 데이터로 교체
  async replaceAll(data: AppData): Promise<void> {
    const [tSnap, lSnap] = await Promise.all([
      getDocs(this.col('templates')),
      getDocs(this.col('lists')),
    ]);
    await Promise.all([
      ...tSnap.docs.map((d) => deleteDoc(d.ref)),
      ...lSnap.docs.map((d) => deleteDoc(d.ref)),
    ]);
    await Promise.all([
      ...data.templates.map((t) => setDoc(doc(this.col('templates'), t.id), t)),
      ...data.lists.map((l) => setDoc(doc(this.col('lists'), l.id), l)),
    ]);
  }

  // 실시간 구독: 두 컬렉션의 변경을 합쳐 최신 데이터를 전달한다. (다기기 동기화)
  subscribe(onData: (data: AppData) => void): () => void {
    let templates: Template[] = [];
    let lists: PackList[] = [];
    let hasT = false;
    let hasL = false;
    const emit = () => {
      if (hasT && hasL) onData({ templates, lists });
    };
    const unsubT = onSnapshot(this.col('templates'), (snap) => {
      templates = snap.docs.map((d) => d.data() as Template).sort((a, b) => a.createdAt - b.createdAt);
      hasT = true;
      emit();
    });
    const unsubL = onSnapshot(this.col('lists'), (snap) => {
      lists = snap.docs.map((d) => d.data() as PackList).sort((a, b) => b.createdAt - a.createdAt);
      hasL = true;
      emit();
    });
    return () => {
      unsubT();
      unsubL();
    };
  }
}
