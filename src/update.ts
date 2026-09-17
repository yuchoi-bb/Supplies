import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const REPO = 'yuchoi-bb/Supplies';

// 빌드 시 주입되는 현재 앱 버전 번호(= GitHub Actions run_number). 없으면 0.
export const APP_VERSION = parseInt(
  (import.meta.env.VITE_APP_VERSION as string | undefined) || '0',
  10
);

export interface UpdateInfo {
  version: number;
  url: string; // APK 다운로드 URL
  pageUrl: string; // 릴리스 페이지
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// 최신 릴리스를 조회해 현재 버전보다 높으면 정보를 반환. (앱=네이티브에서만 의미 있음)
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tag: string = data.tag_name || '';
    const m = tag.match(/(\d+)/);
    const latest = m ? parseInt(m[1], 10) : 0;
    if (!latest || latest <= APP_VERSION) return null;
    const asset = (data.assets || []).find(
      (a: { name?: string; browser_download_url?: string }) => a.name?.endsWith('.apk')
    );
    if (!asset?.browser_download_url) return null;
    return { version: latest, url: asset.browser_download_url, pageUrl: data.html_url };
  } catch {
    return null;
  }
}

// APK 다운로드 페이지를 연다. (다운로드 후 안드로이드 설치 확인창에서 설치)
export async function openDownload(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}
