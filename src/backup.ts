import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { AppData } from './types';

// 준비물 전체를 JSON 문자열로 직렬화
export function serialize(data: AppData): string {
  return JSON.stringify(
    {
      app: 'kangaroo',
      schema: 1,
      exportedAt: new Date().toISOString(),
      templates: data.templates,
      lists: data.lists,
    },
    null,
    2
  );
}

function filename(): string {
  return `kangaroo-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// 백업 내보내기. 앱(안드로이드)에서는 공유 시트로 Google Drive 등에 저장, 웹에서는 파일 다운로드.
export async function exportBackup(data: AppData): Promise<void> {
  const json = serialize(data);
  const name = filename();
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: name,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: 'Kangaroo 준비물 백업',
      text: name,
      url: res.uri,
      dialogTitle: '백업 파일 저장/공유 (Google Drive 등)',
    });
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

// 백업 JSON 문자열을 AppData로 파싱 (형식 검증 포함)
export function parseBackup(text: string): AppData {
  const obj = JSON.parse(text);
  const templates = Array.isArray(obj?.templates) ? obj.templates : null;
  const lists = Array.isArray(obj?.lists) ? obj.lists : null;
  if (!templates || !lists) throw new Error('백업 파일 형식이 아닙니다.');
  return { templates, lists };
}
