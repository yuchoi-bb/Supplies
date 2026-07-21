import {
  collection,
  deleteDoc,
  doc,
  getDocs,
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
}
