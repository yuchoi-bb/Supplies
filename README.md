# 준비물 (Supplies)

여행 · 대회 · 캠핑에 필요한 준비물을 관리하는 체크리스트 앱입니다.
휴대폰 홈 화면에 설치할 수 있는 PWA이며, Google 계정으로 로그인하면 모든 데이터가
계정(Firestore)에 저장되어 **앱을 지웠다 다시 설치해도, 다른 기기에서도 그대로 복원**됩니다.

## 주요 기능

- **기본 준비물(템플릿)**: 마라톤, 자전거대회, 캠핑처럼 반복해서 쓰는 준비물 양식을 만들어 둡니다.
  - 각 항목은 체크박스로 표시되며 **대제목(묶음)** 과 **소제목(항목)** 으로 구성됩니다.
  - 대제목 없이 소제목만으로도 만들 수 있습니다. (제목을 비우면 됩니다)
  - "가" 대제목에 있는 항목을 "나" 대제목으로 **이동**할 수 있습니다.
  - 항목을 다른 기본 준비물로 **복사**할 수 있습니다. (예: 마라톤의 "양말"을 자전거대회에도 추가)
- **실제 준비물**: 기본 준비물을 골라 실제 준비물을 만듭니다. (예: 마라톤 → "서울마라톤 준비물")
  - 항목을 체크/해제하고, 진행률을 확인하고, 자유롭게 추가/삭제할 수 있습니다.
  - 항목을 추가할 때 **"기본 준비물에도 함께 추가"** 를 선택하면 원본 양식에도 반영됩니다.
- **Google 저장**: 로그인하면 모든 데이터가 내 Google 계정에 저장됩니다.
  로그인하지 않으면 기기(브라우저)에만 저장됩니다. 로그인 시 기기 데이터는 계정으로 자동 이전됩니다.
- **오프라인 지원**: Firestore 로컬 캐시와 서비스 워커 덕분에 오프라인에서도 열리고,
  다시 온라인이 되면 자동으로 동기화됩니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## Google 저장(Firebase) 설정

설정하지 않아도 앱은 "기기 저장 모드"로 동작합니다. Google 계정 저장을 켜려면:

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만듭니다.
2. **빌드 > Authentication > 로그인 방법**에서 **Google**을 사용 설정합니다.
   - **설정 > 승인된 도메인**에 앱을 배포한 도메인을 추가합니다.
3. **빌드 > Firestore Database**를 만들고, 규칙을 다음과 같이 설정합니다.

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

4. **프로젝트 설정 > 일반 > 내 앱**에서 웹 앱을 추가하고 설정값을 복사합니다.
5. 저장소의 `.env.example`을 `.env.local`로 복사한 뒤 값을 채우고 빌드합니다.

## 배포와 휴대폰 설치

`npm run build`로 나온 `dist/` 폴더를 Firebase Hosting, Vercel, Netlify, GitHub Pages 등
아무 정적 호스팅에 올리면 됩니다. HTTPS 주소로 접속한 뒤:

- **Android(Chrome)**: 메뉴 > "홈 화면에 추가"
- **iPhone(Safari)**: 공유 > "홈 화면에 추가"

앱을 삭제해도 데이터는 Google 계정에 있으므로, 다시 설치하고 로그인만 하면 복원됩니다.

## 데이터 구조

Firestore에 사용자별로 저장됩니다.

```
users/{uid}/templates/{templateId}   # 기본 준비물 (대제목/소제목 구조)
users/{uid}/lists/{listId}           # 실제 준비물 (체크 상태 포함, 원본 템플릿 참조)
```

## 데이터 연동 가이드 (Firebase 작업자용)

화면 코드는 저장 방식과 분리되어 있어서, 아래 파일만 고치면 데이터 연동을 바꿀 수 있습니다.

| 파일 | 역할 |
| --- | --- |
| `src/types.ts` | 데이터 모양: `Template`(기본 준비물), `PackList`(준비물), `Section`/`Item`, 하위 블록 `SubTopic` |
| `src/firebase.ts` | Firebase 초기화, Google 로그인/로그아웃. 설정값은 `VITE_FIREBASE_*` 환경변수 |
| `src/storage.ts` | 저장소 인터페이스 `Repo`와 구현 2개: `LocalRepo`(기기 저장), `CloudRepo`(Firestore) |
| `src/App.tsx` | 로그인 상태에 따라 `LocalRepo`/`CloudRepo`를 고르고, `repo.subscribe`로 실시간 동기화 |

`Repo` 인터페이스 (`src/storage.ts`):
`loadAll()`, `saveTemplate(t)`, `deleteTemplate(id)`, `saveList(l)`, `deleteList(id)`, `replaceAll(data)`(백업 복원), 선택 `subscribe(onData)`(실시간 동기화).
이 메서드들만 맞추면 화면 쪽은 수정할 필요가 없습니다.

Firestore 경로: `users/{uid}/templates/{templateId}`, `users/{uid}/lists/{listId}`.
같은 Firebase 프로젝트를 다른 앱(예: wishlist)과 함께 쓴다면, 그 앱은 `users/{uid}/wishlist/...`처럼
**다른 하위 컬렉션 이름**을 써야 데이터가 섞이지 않습니다.

설정값 넣는 곳:
- 로컬 개발: `.env.local` (`.env.example` 참고)
- 웹(GitHub Pages)·안드로이드 APK 빌드: 저장소 Settings → Secrets and variables → Actions에 `VITE_FIREBASE_*` 6개.
  두 워크플로(`deploy.yml`, `android.yml`)가 이미 이 값을 빌드에 넣도록 되어 있습니다.
- Firebase 콘솔 → Authentication → 승인된 도메인에 `yuchoi-bb.github.io` 추가.

주의: 안드로이드 앱은 Capacitor 웹뷰 안에서 돌기 때문에, 현재의 `signInWithPopup`(웹 팝업 로그인)은
Google 정책상 앱 안에서 막힐 가능성이 큽니다. 안드로이드 로그인은 네이티브 로그인 플러그인
(예: `@capacitor-firebase/authentication`)으로 바꾸는 작업이 필요합니다. 웹에서는 지금 방식 그대로 동작합니다.
