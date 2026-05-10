# 자아앙

내 옷을 잊지 않는 방법. 개인 옷장 데이터를 관리하고 분석하는 PWA입니다.

제품명, 브랜드, 카테고리, 색상, 사이즈, 구매가, 정가, 구매일, 보유 상태, 평점, 실측, 사진을 한 곳에 저장합니다. 로컬 브라우저 저장소를 기본으로 사용하고, Supabase를 연결하면 로그인한 사용자 기준으로 여러 기기에서 같은 옷장을 동기화할 수 있습니다.

이 저장소를 가져가서 쓰는 사람은 개인 옷장 앱의 기본 골격으로 사용할 수 있습니다. CSV로 기존 데이터를 가져오고, Supabase 프로젝트만 바꿔 연결하면 본인 데이터로 운영할 수 있게 구성되어 있습니다.

- 서비스 설계 PRD: [docs/service-design.md](docs/service-design.md)

## 주요 기능

- 제품 목록 관리: 카테고리, 브랜드, 색상, 가격대, 보유 상태, 평점 필터
- 검색과 정렬: 제품명, 브랜드, 색상 검색과 구매일/구매가 기준 정렬
- 제품 상세 편집: 구매 정보, 사이즈, 실측, 이미지, 평점, 보유 상태 관리
- 이미지 관리: 파일 업로드, 외부 이미지 URL, Supabase Storage 연동
- CSV 가져오기/내보내기: 기존 옷장 데이터 이관과 백업
- JSON/ZIP 백업: 데이터와 이미지를 포함한 백업 흐름
- 분석 대시보드: 구매 총액, 할인, 소비 추이, 색상 분포, 실측 범위, 브랜드 랭킹
- 모바일 대응: 하단 내비게이션, 모바일 필터 시트, 카테고리 탭
- PWA: 정적 배포와 서비스 워커 기반 앱 설치 흐름

## 화면 구조

앱은 크게 두 화면으로 나뉩니다.

`/`

옷장 목록 화면입니다. 상위/하위 카테고리를 기준으로 제품을 탐색하고, 필터와 검색으로 목록을 좁힙니다. 제품 카드를 열면 상세 모달에서 정보를 편집할 수 있습니다.

`/analysis`

옷장 인사이트 화면입니다. 보유 중인 제품 또는 전체 제품을 기준으로 요약 지표를 계산합니다. 브랜드 랭킹은 개수 순과 구매 금액 순으로 전환할 수 있고, 금액 기준은 정가가 아니라 실제 구매가 합계입니다.

## 기술 구조

- 앱 셸: Vite + React + TypeScript
- 스타일: Tailwind CSS v4 토큰 + shadcn/ui 기반 컴포넌트
- 레거시 런타임: `assets/js/app.js`
- 필터 브리지: `assets/js/closet-filter-utils.js`, `src/closet/*`
- 로컬 저장: IndexedDB
- 원격 저장: Supabase Postgres
- 인증: Supabase Auth Google OAuth
- 이미지 저장: IndexedDB, Supabase Storage, 외부 이미지 URL
- 배포: Cloudflare Pages 같은 정적 호스팅

React 쪽은 화면 구성과 최신 UI를 담당하고, 기존 데이터 처리와 동기화 로직은 `assets/js/app.js`에 남아 있습니다. 두 영역은 `window.closetBridge`와 필터 브리지로 연결됩니다.

## 폴더 안내

```text
src/
  App.tsx                         앱 셸, 목록 화면, 모바일/데스크톱 레이아웃
  AnalysisPage.tsx                분석 화면 엔트리
  ClosetDetailDialog.tsx          제품 상세 보기/편집 모달
  closet/                         필터 상태, 분석 타입, 분석 계산 유틸
  components/analysis/            분석 대시보드 섹션 컴포넌트
  components/ui/                  shadcn 스타일의 공통 UI 컴포넌트
  index.css                       앱 전체 스타일

assets/js/
  app.js                          데이터 로딩, IndexedDB, Supabase 동기화, CSV/백업
  closet-filter-utils.js          필터 옵션, 정렬, 카테고리 순서 유틸

supabase/
  schema.sql                      Postgres 테이블/RLS/Storage 정책

scripts/
  build.cjs                       Vite 빌드 후 런타임 파일 복사
  vite-dev.cjs                    개발 서버 실행 및 로그 저장
artifacts/
  logs/                           로컬 개발 서버 로그
  screenshots/                    검증용 스크린샷
```

## 처음 실행하기

Node 20 이상을 권장합니다.

```powershell
npm install
npm run dev -- --host=127.0.0.1 --port=5176
```

개발 서버 로그는 `artifacts/logs/`에 생성되며 Git에는 포함되지 않습니다.

브라우저에서 엽니다.

```text
http://127.0.0.1:5176
```

이 프로젝트 폴더에서 시스템 Node 22와 일부 CLI 조합이 불안정한 경우가 있어, 문제가 생기면 Node 20 런타임으로 실행하세요.

```powershell
npx -p node@20 -p npm@10 npm run dev -- --host=127.0.0.1 --port=5176
```

## 빌드

```powershell
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다. `scripts/build.cjs`는 Vite 빌드 후 런타임에 필요한 파일을 함께 복사합니다.

- `config.js`
- `config.example.js`
- `sw.js`

로컬 내부 테스트용 CSV와 임시 이미지는 `assets/temp/`에 둘 수 있지만, 배포 산출물에는 포함하지 않습니다.

## 내 데이터로 쓰기

1. 저장소를 클론합니다.
2. `npm install`을 실행합니다.
3. 필요하면 `config.example.js`를 참고해 `config.js`를 만듭니다.
4. Supabase를 쓸 경우 새 Supabase 프로젝트를 만들고 `supabase/schema.sql`을 실행합니다.
5. Supabase URL과 anon key를 `config.js` 또는 환경 변수로 연결합니다.
6. 앱을 실행한 뒤 CSV 가져오기 또는 새 제품 추가로 데이터를 채웁니다.

Supabase 없이도 브라우저의 IndexedDB에 로컬 데이터가 저장됩니다. 다만 다른 기기와 동기화하려면 Supabase 설정이 필요합니다.

## Supabase 설정

Supabase SQL editor에서 `supabase/schema.sql`을 실행합니다. 이 스키마에는 제품 데이터, 이미지 메타데이터, 사용자별 접근 정책, Storage 정책이 포함됩니다.

런타임 설정 방법은 두 가지입니다.

```js
// config.js
window.WARDROBE_CONFIG = {
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-key",
  imageStorage: {
    provider: "supabase-storage",
    bucket: "wardrobe-images",
    signedUrlExpiresInSeconds: 3600
  }
};
```

또는 Vite 환경 변수로 주입할 수 있습니다.

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_IMAGE_STORAGE_PROVIDER=supabase-storage
VITE_IMAGE_STORAGE_BUCKET=wardrobe-images
VITE_SIGNED_IMAGE_URL_EXPIRES_IN_SECONDS=3600
```

브라우저에 노출되는 값은 반드시 Supabase publishable/anon key여야 합니다. Google Client Secret 같은 비밀값은 앱 코드나 `config.js`에 넣지 말고 Supabase Dashboard에만 저장하세요.

## 이미지 저장소 확장

기본 이미지 저장소는 Supabase Storage의 `wardrobe-images` 버킷입니다. 다만 이미지 트래픽이 커질 경우 Supabase Auth/Postgres는 유지하고 이미지 오브젝트 저장소만 R2/S3 등으로 옮길 수 있도록, 원격 이미지 메타데이터는 `storageProvider`, `storageBucket`, `storagePath` locator 구조를 사용합니다.

- provider 설정과 locator 정규화는 `assets/js/closet-image-provider-utils.js`에서 관리합니다.
- Supabase 동기화는 `assets/js/closet-supabase-utils.js`가 provider 유틸을 통해 bucket/path를 읽습니다.
- `supabase/schema.sql`의 `item_images.storage_provider`, `storage_bucket`, `storage_path` 컬럼은 나중에 이미지 저장소를 교체하기 위한 확장 지점입니다.
- 원격 이미지는 IndexedDB Blob 캐시를 우선 사용하고, signed URL은 캐시 실패 시 fallback으로 남깁니다.

## Google 로그인 설정

앱은 Supabase Google OAuth를 사용합니다.

Google Cloud OAuth Client:

- Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
- Authorized JavaScript origins: 로컬과 배포 도메인

예:

```text
http://127.0.0.1:5176
https://your-project.pages.dev
https://your-custom-domain.com
```

Supabase Dashboard:

- Authentication > Providers > Google 활성화
- Google Client ID와 Client Secret 입력
- Authentication > URL Configuration에 로컬/배포 앱 주소 추가

같은 이메일의 매직링크 계정과 Google 계정은 Supabase Auth의 identity linking 정책에 따라 같은 사용자로 연결될 수 있습니다. 이 앱의 데이터 접근은 `auth.uid()` 기준입니다.

## CSV 가져오기

상단의 가져오기 메뉴에서 CSV를 넣을 수 있습니다. 현재 CSV 파서는 한국어 컬럼명을 기준으로 동작합니다.

주요 컬럼:

- `이름`
- `브랜드`
- `상위 카테고리`
- `카테고리`
- `색상`
- `사이즈 요약`
- `신발 사이즈`
- `정가`
- `구매가`
- `구매일`
- `보유`
- 실측 컬럼: `총장`, `어깨`, `가슴`, `소매`, `허리`, `허벅지`, `밑위`, `밑단`, `폭`, `높이` 등

정가와 구매가는 별도로 저장됩니다. 분석의 구매 총액과 브랜드 금액 순 정렬은 `구매가`를 기준으로 합니다.

## 카테고리와 실측

기본 카테고리 트리는 상의, 아우터, 하의, 신발, 가방, 악세사리 흐름을 기준으로 구성되어 있습니다. 카테고리별 실측 템플릿은 제품 상세에서 자동으로 필요한 필드를 제안하고, 분석 화면에서는 보유 중인 제품의 실측값을 기반으로 25~75% 범위를 보여줍니다.

카테고리 순서나 하위 카테고리를 바꾸려면 다음 파일을 함께 확인하세요.

- `assets/js/app.js`
- `assets/js/closet-filter-utils.js`
- `src/components/analysis/MeasurementSection.tsx`

## 배포

Cloudflare Pages 기준 설정:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20` 이상 권장

배포 후 Supabase Auth URL 설정과 Google OAuth origin에 배포 도메인을 추가해야 로그인 후 앱으로 정상 복귀합니다.

## 개발 메모

- 디자인 기준은 `DESIGN.md`를 따릅니다.
- 공통 UI는 가능한 `src/components/ui` 컴포넌트를 사용합니다.
- 레거시 DOM은 아직 `assets/js/app.js`에서 생성되는 부분이 있으므로, 스타일 변경은 `src/index.css`에서 React UI와 함께 맞춰야 합니다.
- 데이터 구조를 바꿀 때는 `supabase/schema.sql`, CSV import/export, IndexedDB 마이그레이션 흐름을 같이 확인해야 합니다.
