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

// 하위 주제. 주제(기본 준비물) 안에 다른 주제를 통째로 넣을 때 사용.
// 예: "호주여행" 안에 "마라톤"을 하위 주제로 중첩.
export interface SubTopic {
  id: string;
  name: string;
  sections: Section[];
}

// 기본 준비물 (예: 마라톤, 자전거대회, 캠핑)
export interface Template {
  id: string;
  name: string;
  sections: Section[];
  // 이 주제 안에 중첩된 하위 주제들. 예전 데이터에는 없을 수 있어 선택 필드.
  subtopics?: SubTopic[];
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

export interface CheckSubTopic {
  id: string;
  name: string;
  sections: CheckSection[];
}

// 실제 준비물 (예: 서울마라톤 준비물 — "마라톤" 템플릿에서 생성)
export interface PackList {
  id: string;
  name: string;
  templateId: string | null;
  templateName: string | null;
  sections: CheckSection[];
  subtopics?: CheckSubTopic[];
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

// 대제목/소제목을 새 id로 깊은 복사 (기본 준비물용)
function cloneSections(sections: Section[]): Section[] {
  return sections.map((s) => ({
    id: uid(),
    title: s.title,
    items: s.items.map((it) => ({ id: uid(), name: it.name })),
  }));
}

// 대제목/소제목을 체크리스트용으로 복사 (체크 상태는 모두 해제)
function toCheckSections(sections: Section[]): CheckSection[] {
  return sections.map((s) => ({
    id: uid(),
    title: s.title,
    items: s.items.map((it) => ({ id: uid(), name: it.name, checked: false })),
  }));
}

// 기본 준비물 하나를 다른 주제 안에 넣을 "하위 주제"로 변환.
// 중첩은 한 단계만 유지하기 위해, 원본이 이미 가진 하위 주제는 대제목으로 펼쳐서 합친다.
export function subtopicFromTemplate(source: Template): SubTopic {
  const nestedSections = (source.subtopics ?? []).flatMap((st) => st.sections);
  return {
    id: uid(),
    name: source.name,
    sections: cloneSections([...source.sections, ...nestedSections]),
  };
}

// 템플릿에서 실제 준비물 리스트를 생성 (체크 상태는 모두 해제)
export function listFromTemplate(template: Template, name: string): PackList {
  const now = Date.now();
  return {
    id: uid(),
    name,
    templateId: template.id,
    templateName: template.name,
    sections: toCheckSections(template.sections),
    subtopics: (template.subtopics ?? []).map((st) => ({
      id: uid(),
      name: st.name,
      sections: toCheckSections(st.sections),
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
    subtopics: [],
    createdAt: now,
    updatedAt: now,
  };
}

// 기본 준비물(주제) 전체를 새 이름으로 복사. 모든 대제목/소제목/하위 주제가 새 id로 복제된다.
// 예: "마라톤"을 복사해 "트레일러닝대회"를 만들 때 사용.
export function duplicateTemplate(template: Template, name: string): Template {
  const now = Date.now();
  return {
    id: uid(),
    name,
    sections: cloneSections(template.sections),
    subtopics: (template.subtopics ?? []).map((st) => ({
      id: uid(),
      name: st.name,
      sections: cloneSections(st.sections),
    })),
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
    subtopics: [],
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
