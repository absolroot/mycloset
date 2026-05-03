# Closet

PC와 모바일에서 관리하는 개인 옷장 PWA입니다.

현재 UI는 Vite React 셸과 shadcn/ui 컴포넌트를 기준으로 구성되어 있고, 기존 CSV/IndexedDB/Supabase 동기화 로직은 `assets/js/app.js`에서 유지합니다.

## 현재 구성

- 프론트엔드: Vite + React + TypeScript + Tailwind CSS/shadcn 스타일 토큰
- 데이터 저장: IndexedDB 로컬 캐시 + Supabase Postgres
- 인증: Supabase Auth Google OAuth
- 이미지: IndexedDB 로컬 이미지 + Supabase Storage + 외부 이미지 URL
- 배포 대상: Cloudflare Pages 정적 배포
- 빌드 결과: `dist/`

## 실행

이 폴더 경로에서 시스템 Node 22가 일부 node_modules CLI를 비정상 종료시키는 문제가 있어, 검증은 Node 20 런타임으로 실행했습니다.

```powershell
npx -p node@20 -p npm@10 npm run dev -- --host=127.0.0.1 --port=5176
```

현재 개발 서버:

```text
http://127.0.0.1:5176
```

## 빌드

```powershell
npx -p node@20 -p npm@10 npm run build
```

빌드 결과물은 `dist/`에 생성됩니다. Vite 빌드 후 다음 런타임 파일은 자동 복사됩니다.

- `config.js`
- `config.example.js`
- `sw.js`
- `Closet 137abb41507c80699008e26e88fa26d9_all (2).csv`

## Cloudflare Pages

Cloudflare Pages에서는 정적 사이트로 배포합니다.

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20` 권장

Cloudflare 배포 도메인이 정해지면 Supabase Auth URL 설정에 해당 도메인을 추가해야 Google 로그인 후 앱으로 돌아올 수 있습니다.

예:

```text
https://your-project.pages.dev
https://your-custom-domain.com
```

## 구현 상태

- CSV 가져오기/내보내기
- IndexedDB 로컬 저장
- Supabase Auth/Postgres/Storage 자동 동기화
- 제품 목록 필터/정렬/검색
- 제품 상세 모달 편집
- 카테고리별 실측 템플릿
- 이미지 파일 업로드
- 이미지 URL 저장
- 이미지 표시 위치/크기 조정
- PWA service worker

## 디자인

디자인 기준은 `DESIGN.md`를 따릅니다. 신규 UI는 shadcn/ui 컴포넌트를 우선 사용하고, 기존 `assets/js/app.js`가 동적으로 만드는 DOM은 `src/index.css`에서 같은 shadcn 토큰으로 스타일링합니다.

## Supabase

Supabase SQL editor에서 최신 `supabase/schema.sql`을 실행해야 합니다. 현재 스키마에는 카테고리/실측 확장과 이미지 URL 저장용 `items.image_url`, `items.image_edit` 컬럼이 포함되어 있습니다.

현재 Supabase 프로젝트:

```text
https://ocxjqpjflikmnedvviag.supabase.co
```

클라이언트 런타임 설정은 `config.js` 또는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`로 주입합니다. 브라우저에 노출되는 값은 Supabase publishable/anon key여야 하며, Google Client Secret 같은 비밀값은 Supabase Dashboard에만 둡니다.

## Google 로그인 설정

앱 로그인은 Supabase Google OAuth를 사용합니다.

Google Cloud OAuth Client 설정:

- Authorized redirect URIs: `https://ocxjqpjflikmnedvviag.supabase.co/auth/v1/callback`
- Authorized JavaScript origins: `http://127.0.0.1:5176`
- Cloudflare 배포 후 Authorized JavaScript origins에 `https://...pages.dev` 또는 커스텀 도메인 추가

Supabase Dashboard 설정:

- Authentication > Providers > Google 활성화
- Google Client ID와 Client Secret 입력
- Authentication > URL Configuration에 로컬/배포 앱 주소 추가

같은 이메일의 매직링크 계정과 Google 계정은 Supabase Auth의 identity linking 정책에 따라 같은 `auth.users.id`로 연결될 수 있습니다. 현재 DB 접근은 사용자 ID 기준으로 동작하므로 같은 `auth.uid()`로 로그인되면 같은 옷장 데이터를 참조합니다.
