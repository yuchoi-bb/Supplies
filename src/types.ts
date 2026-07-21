// 기본 준비물(템플릿)과 실제 준비물(리스트)의 데이터 모델

export interface Item {
  id: string;
  name: string;
}

// 대제목(섹션). title이 빈 문자열이면 제목 없이 소제목만 나열되는 섹션.
export interface Section {
  id: string;
  title: string;
  items: Item[];
}

// 기본 준비물 (예: 마라톤, 자전거대회, 캠핑)
export interface Template {
  id: string;
  name: string;
  sections: Section[];
  createdAt: number;
  updatedAt: number;
}

export interface CheckItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface CheckSection {
  id: string;
  title: string;
  items: CheckItem[];
}

// 실제 준비물 (예: 서울마라톤 준비물 — "마라톤" 템플릿에서 생성)
export interface PackList {
  id: string;
  name: string;
  templateId: string | null;
  templateName: string | null;
  sections: CheckSection[];
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  templates: Template[];
  lists: PackList[];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function sectionLabel(title: string): string {
  return title.trim() === '' ? '(제목 없음)' : title;
}

// 템플릿에서 실제 준비물 리스트를 생성 (체크 상태는 모두 해제)
export function listFromTemplate(template: Template, name: string): PackList {
  const now = Date.now();
  return {
    id: uid(),
    name,
    templateId: template.id,
    templateName: template.name,
    sections: template.sections.map((s) => ({
      id: uid(),
      title: s.title,
      items: s.items.map((it) => ({ id: uid(), name: it.name, checked: false })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyTemplate(name: string): Template {
  const now = Date.now();
  return {
    id: uid(),
    name,
    sections: [{ id: uid(), title: '', items: [] }],
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyList(name: string): PackList {
  const now = Date.now();
  return {
    id: uid(),
    name,
    templateId: null,
    templateName: null,
    sections: [{ id: uid(), title: '', items: [] }],
    createdAt: now,
    updatedAt: now,
  };
}

// 처음 사용할 때 보여줄 예시 데이터
export function seedTemplates(): Template[] {
  const now = Date.now();
  const make = (name: string, sections: [string, string[]][]): Template => ({
    id: uid(),
    name,
    sections: sections.map(([title, items]) => ({
      id: uid(),
      title,
      items: items.map((n) => ({ id: uid(), name: n })),
    })),
    createdAt: now,
    updatedAt: now,
  });
  return [
    make('마라톤', [
      ['대회 필수', ['배번호(번호표)', '기록칩', '러닝화', '러닝복']],
      ['의류', ['양말', '모자', '바람막이', '여벌 옷']],
      ['보급·기타', ['에너지젤', '물통', '선크림', '바세린']],
    ]),
    make('캠핑', [
      ['숙박', ['텐트', '침낭', '매트', '랜턴']],
      ['취사', ['버너', '코펠', '식재료', '아이스박스']],
      ['기타', ['의자', '테이블', '모기약', '상비약']],
    ]),
  ];
}
