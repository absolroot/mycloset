# 자아앙 서비스 설계 PRD

작성일: 2026-05-10

대상: 현재 웹 PWA로 구성된 개인 옷장 서비스를 웹 MVP로 검증한 뒤 iOS/Android 앱과 웹에서 함께 접근 가능한 서비스로 확장

문서 성격: 제품 방향, 현재 기능 인벤토리, UX, 데이터, 기술 아키텍처, Supabase 확장성, 비용, 운영, 법무 리스크를 함께 보는 실행 설계

이 문서는 법률 자문이 아니다. 개인정보, 이미지 저작권, 계정 삭제, 앱스토어 심사, 약관/개인정보처리방침은 공개 출시 전 실제 운영자 정보와 정책에 맞춰 검토해야 한다. 다만 개인 개발자가 웹 MVP에서 앱 출시까지 이어갈 수 있도록 실무 기준으로 정리한다.

## 0. 핵심 판단

자아앙은 쇼핑몰, 코디 SNS, 중고거래 앱이 아니라 `내가 가진 옷을 잊지 않게 해주는 개인 옷장 기록 서비스`로 시작해야 한다.

첫 사용자가 얻어야 하는 가치는 "옷을 사고 싶은 곳을 찾는다"가 아니라 "이미 가진 옷을 빠르게 남기고 다시 찾는다"다. 데이터가 적은 초기에도 개인 기록장은 혼자서 쓸 이유가 있고, 기록이 쌓이면 검색, 필터, 분석, 앱 알림, 코디 보조가 자연스럽게 강해진다.

앱을 만들더라도 초기에 완전한 네이티브 재작성으로 가면 안 된다. 현재 Vite + React + TypeScript 웹 앱은 이미 목록, 상세 편집, 분석, 계정, 백업, 법무 화면을 갖고 있다. 따라서 1차 앱은 같은 웹 코드를 기반으로 한 PWA/Capacitor 앱 셸로 출발하고, 네이티브 기능은 사진 선택, 파일 공유, 푸시 알림처럼 명확한 가치가 있을 때만 붙이는 것이 맞다.

Supabase Free Plan 하나로 시작하는 것은 검증 단계에서는 충분하지만, 공개 서비스 운영의 기준점으로 삼으면 위험하다. 현재 구조에서 가장 먼저 비용과 성능을 압박하는 것은 Postgres row 수보다 이미지 저장/전송, signed URL 재발급, 동기화 풀링, 백업/삭제 운영이다. 이미 스키마에 `storage_provider`, `storage_bucket`, `storage_path` locator가 있으므로, Auth/Postgres는 Supabase에 두고 이미지 오브젝트만 Cloudflare R2/S3로 분리할 수 있게 가야 한다.

MVP의 핵심 운영 기능은 AI 추천보다 `데이터 내보내기`, `계정/게스트 전환`, `이미지 용량 제한`, `삭제 요청 처리`, `백업`, `마이그레이션`이다. 개인 옷장 데이터는 사용자가 다시 신뢰하고 넣어야 가치가 생기므로, "서비스가 사라져도 내 데이터를 가져갈 수 있다"는 구조가 제품 신뢰의 중심이다.

## 1. 현재 구현 확인

### 확인 기준

이 PRD는 실제 저장소 `C:\Users\super\Desktop\옷장`의 현재 구현을 기준으로 작성했다.

- 라우트: `src/appRoutes.ts`
- 앱 셸/내비게이션: `src/App.tsx`
- 로그인: `src/LoginPage.tsx`
- 마이페이지/계정 작업: `src/MyPage.tsx`
- 제품 상세 보기/편집: `src/ClosetDetailDialog.tsx`
- 분석 대시보드: `src/AnalysisPage.tsx`, `src/closet/analysisUtils.ts`
- 필터/정렬: `src/closet/filterTypes.ts`, `assets/js/closet-filter-utils.js`
- 카테고리/실측: `assets/js/closet-category-utils.js`, `assets/js/closet-measurement-utils.js`
- 레거시 런타임/동기화: `assets/js/app.js`, `assets/js/closet-supabase-utils.js`
- 데이터 스키마/RLS: `supabase/schema.sql`
- 서비스 소개/약관/개인정보처리방침: `src/legal/legalContent.ts`
- 디자인 시스템: `DESIGN.md`

### 현재 화면

현재 앱은 다음 라우트를 가진다.

- `/`: 옷장 목록과 필터, 제품 카드, 상세 모달 진입
- `/analysis`: 옷장 인사이트 대시보드
- `/my`: 계정 상태, 동기화, 게스트 데이터 가져오기, CSV/JSON/ZIP 내보내기, 법무 링크
- `/login`: 게스트 시작 또는 Google 로그인
- `/about`: 서비스 소개
- `/terms`: 이용약관
- `/privacy`: 개인정보처리방침

### 현재 주요 기능

제품 관리:

- 제품 추가, 편집, 삭제, 복제
- 제품명, 브랜드, 상위 카테고리, 상세 카테고리, 색상, 사이즈, 신발 사이즈
- 정가, 실구매가, 구매일, 제품 URL
- 보유 중/정리함 상태
- 1~5점 내 평점과 미평점
- 메모
- 카테고리별 실측 템플릿과 사용자 실측 추가
- 파일 이미지 업로드, 이미지 URL 추가, 이미지 편집 위치/크기 조정, 이미지 삭제

탐색/필터:

- 제품명/브랜드/색상/카테고리/사이즈 텍스트 검색
- 상위/하위 카테고리 필터
- 브랜드, 색상, 보유 상태, 가격대, 평점 필터
- 기본 정렬, 최근 수정, 구매일, 구매가 높은순, 이름순
- 기본 정렬은 보유 상태, 카테고리 순서, 하위 카테고리, 구매일 최신순, 이름순, 최근 수정순을 반영한다.

분석:

- 보유 중/전체 범위 전환
- 제품 수, 보유 수, 구매 총액, 정가 총액, 할인 금액, 평균 구매가, 가격 누락 수
- 구매 추이
- 색상 분포와 색상별 구매 금액
- 브랜드 랭킹과 브랜드별 구매 금액/정가/할인/카테고리
- 보유 중 제품 기준 실측 25~75% 범위

계정/저장:

- 게스트 모드로 시작
- Google OAuth 로그인
- 게스트 옷장과 로그인 계정 옷장 분리
- 로그인 후 게스트 옷장 가져오기
- IndexedDB 로컬 저장
- Supabase Postgres 동기화
- Supabase Storage 이미지 저장
- 원격 이미지 IndexedDB Blob 캐시
- CSV 가져오기/내보내기
- JSON 백업
- 이미지 포함 ZIP 백업

정책/문서:

- 서비스 소개, 이용약관, 개인정보처리방침 화면
- Google, Supabase 위탁/국외 이전 안내 초안
- 게스트 저장소와 IndexedDB 사용 안내
- 계정 삭제 또는 데이터 삭제 요청 가능성 안내

### 현재 기술 부채

React 셸과 레거시 DOM 런타임이 공존한다. `assets/js/app.js`가 데이터 로딩, IndexedDB, Supabase 동기화, CSV/백업, 일부 DOM 이벤트를 계속 담당하고, React는 앱 셸과 상세 모달, 분석/마이/법무 화면을 담당한다.

이 구조는 웹 MVP에는 현실적이지만 앱 전환 시 다음 위험이 있다.

- 네이티브 앱에서 OAuth callback, 파일 선택, service worker, IndexedDB quota 동작을 재검증해야 한다.
- 동기화 실패/재시도 상태가 사용자에게 충분히 투명하지 않다.
- 계정 삭제/전체 데이터 삭제는 약관에 언급되지만 현재 명확한 앱 내 실행 플로우가 부족하다.
- `share_snapshots` 스키마는 남아 있으나 현재 단일 아이템 공유 UI는 제거된 상태다. 앱 MVP 요구사항으로 다시 올리지 않는다.
- 이미지 저장소 provider locator는 준비되어 있지만 Supabase 외 provider 런타임 구현은 아직 없다.

## 2. 제품 포지셔닝

### 푸는 문제

옷은 생각보다 쉽게 잊힌다. 사진첩, 쇼핑몰 주문 내역, 메모장, 머릿속 기억에 흩어져 있고, 실제로 입으려 할 때는 다음 질문이 남는다.

- 내가 이런 옷을 이미 갖고 있었나
- 어느 브랜드의 어느 사이즈가 잘 맞았나
- 정가가 아니라 실제로 얼마에 샀나
- 비슷한 색/카테고리가 이미 많은가
- 이 제품 실측이 내 몸에 맞는 기준과 비슷한가
- 정리한 옷까지 포함해서 구매 패턴을 보고 싶은가

따라서 제품 문장은 다음처럼 잡는다.

> 내 옷을 잊지 않고 다시 꺼내 볼 수 있게 하는 개인 옷장 기록 서비스.

### 기존 앱과의 차이

쇼핑몰 앱과 다르게 구매 전 탐색이 아니라 구매 후 소유 데이터가 중심이다.

코디 앱과 다르게 처음부터 피드/룩북/팔로우를 요구하지 않는다.

중고거래 앱과 다르게 판매 전환이 핵심 목적이 아니다.

스프레드시트와 다르게 사진, 필터, 모바일 상세 편집, 실측, 백업, 계정 동기화를 하나의 제품 경험으로 묶는다.

### 초기 타깃

초기 타깃은 옷을 자주 사고, 브랜드/사이즈/실측/구매가를 기록할 이유가 있는 개인 사용자다.

- 여러 브랜드의 사이즈 편차를 겪는다.
- 비슷한 색상/카테고리를 반복 구매한다.
- 쇼핑몰 주문 내역이나 메모장만으로는 다시 찾기 어렵다.
- 정가보다 실구매가와 할인 체감이 중요하다.
- 옷장을 정리하거나 재구매 판단을 할 때 과거 데이터를 보고 싶다.

### 확장 타깃

확장은 더 넓은 개인 소장품 관리로 간다.

- 옷장을 정리하려는 일반 사용자
- 신발/가방/악세사리 중심으로 소장품을 기록하는 사용자
- 이사, 계절 전환, 중고 판매 전 보유 목록을 정리하려는 사용자
- 가족이나 파트너와 일부 옷장 데이터를 공유하고 싶은 사용자

다만 공개 SNS나 쇼핑 추천으로 성급하게 이동하면 제품의 신뢰 기반이 흔들린다. 확장 후에도 개인 데이터의 소유권과 백업 가능성이 중심이어야 한다.

## 3. 웹 MVP 범위

### MVP 필수 기능

웹 MVP에 반드시 포함되어야 하는 기능은 다음이다.

- 게스트 모드
- Google 로그인과 계정 동기화
- 게스트 옷장 가져오기
- 제품 추가/수정/삭제/복제
- 카테고리, 브랜드, 색상, 사이즈, 구매 정보, 보유 상태, 평점, 메모, 실측
- 이미지 파일 업로드, 이미지 URL, 이미지 편집
- 검색, 카테고리/브랜드/색상/가격대/상태/평점 필터
- CSV 가져오기/내보내기
- JSON/ZIP 백업
- 분석 대시보드
- 서비스 소개/약관/개인정보처리방침
- 모바일 웹 레이아웃
- PWA 설치와 정적 배포

현재 구현은 이 범위 대부분을 만족한다. 다만 공개 MVP 기준으로는 계정 삭제/전체 데이터 삭제, 동기화 오류 복구 UX, 백업 안내, 앱스토어 제출용 정책 문서가 보강되어야 한다.

### MVP에서 빼야 할 기능

다음은 웹 MVP에서 제외한다.

- 공개 옷장 피드
- 팔로우, 댓글, DM
- 코디 추천 AI
- 쇼핑몰 가격 추적
- 중고 판매 등록
- 영수증/OCR 자동 입력
- 브랜드 공식 DB
- 네이티브 앱 전체 재작성
- 공개 공유 링크 재도입
- 여러 명이 동시에 편집하는 공동 옷장

이유는 단순하다. 개인 개발자 MVP는 기록과 데이터 신뢰가 먼저이고, 공개 소셜/추천/거래는 운영 부담과 법무 리스크를 크게 늘린다.

## 4. 사용자 경험 설계

### 첫 실행

첫 실행은 로그인 강제가 아니라 선택으로 시작한다.

- `게스트 모드로 시작하기`
- `Google로 로그인하기`

현재 `src/LoginPage.tsx`는 게스트 시작을 1차 CTA로 두고, Google 로그인은 동기화가 필요할 때 선택할 수 있게 한다. 이 방향을 유지한다.

게스트 모드는 예시 제품 3개를 보여줘야 한다. 빈 옷장은 사용자가 무엇을 입력해야 할지 판단하기 어렵기 때문이다. 현재 로그인 화면도 이 점을 안내한다.

### 제품 추가 플로우

제품 추가는 모바일 기준 1분 안에 저장 가능해야 한다.

필수:

1. 제품명
2. 상위 카테고리

권장:

1. 사진
2. 브랜드
3. 상세 카테고리
4. 색상
5. 사이즈
6. 실구매가
7. 구매일

선택:

1. 정가
2. 제품 URL
3. 평점
4. 메모
5. 실측

상세 입력은 강제하지 않는다. 자아앙의 입력 철학은 "정확한 모든 정보를 한 번에 입력"이 아니라 "나중에 찾을 수 있을 만큼 빠르게 남기기"다.

### 제품 상세 UX

제품 상세는 보기 모드와 편집 모드가 분리되어야 한다. 현재 `ClosetDetailDialog`가 이 구조를 갖고 있으므로 유지한다.

보기 모드:

- 큰 이미지
- 보유 상태
- 카테고리
- 제품명
- 브랜드/색상/사이즈 요약
- 평점 빠른 수정
- 기본 정보
- 구매 정보
- 메모
- 실측
- 편집, 복제, 삭제

편집 모드:

- 이미지 업로드/URL/편집/삭제
- 기본 정보
- 구매 정보
- 메모
- 실측 추가
- 저장

앱에서는 상세 화면을 모달처럼 보이게 하되, 네이티브 뒤로가기가 닫기/목록 복귀와 충돌하지 않도록 별도 검증이 필요하다.

### 검색/필터 UX

검색은 제품명, 브랜드, 색상, 카테고리, 사이즈를 한 번에 찾는다. 필터는 카테고리, 브랜드, 색상, 보유 상태, 가격대, 평점으로 충분하다.

가격대는 현재 실구매가 기준이다. 정가보다 사용자의 실제 구매 행동을 더 정확히 보여주므로 이 기준을 유지한다.

기본 정렬은 "보유 중 먼저, 카테고리 순서, 하위 카테고리, 구매일 최신순"이 맞다. 같은 카테고리 안에서는 최근 산 제품이 먼저 보이는 것이 옷장 기억에 더 유용하다.

### 분석 UX

분석 화면은 데이터가 많아질수록 가치가 커진다. 현재 구조는 다음 질문에 답해야 한다.

- 지금 보유 중인 제품은 몇 개인가
- 실제 구매 총액은 얼마인가
- 정가 대비 얼마를 아꼈는가
- 어느 기간에 구매가 몰렸는가
- 어떤 색이 많은가
- 어떤 브랜드에 돈을 많이 썼는가
- 내 실측 기준은 어느 범위인가

분석 화면은 마케팅용 대시보드가 아니라 개인 판단 도구다. 숫자는 정가가 아니라 실구매가를 우선하고, 보유 중/전체 범위를 명확히 분리한다.

### 마이페이지 UX

마이페이지는 계정 설정이 아니라 `데이터 신뢰 허브`여야 한다.

현재 포함된 작업:

- 로그인/로그아웃
- Google 동기화
- 게스트 옷장 가져오기
- CSV 가져오기/내보내기
- JSON 백업
- 이미지 포함 ZIP 백업
- 화면 모드
- 서비스 소개/약관/개인정보처리방침

추가해야 할 작업:

- 계정 데이터 전체 삭제 요청
- 게스트 데이터 초기화
- 마지막 백업 시각 표시
- 동기화 실패 상세와 재시도
- 앱 버전/빌드 정보

## 5. 앱 전환 설계

### 앱 전환 원칙

앱은 웹과 별도 제품이 아니라 같은 서비스의 접근 채널이어야 한다. 사용자는 웹에서 입력한 옷장을 앱에서 보고, 앱에서 찍은 사진을 웹에서 볼 수 있어야 한다.

초기 권장 구조:

```text
Vite React Web App
  -> PWA on Cloudflare Pages
  -> Capacitor iOS/Android shell
  -> Supabase Auth/Postgres
  -> Supabase Storage initially
  -> R2/S3 image storage later through provider locator
```

Capacitor를 권장하는 이유:

- 현재 React/TypeScript 코드와 UI를 재사용할 수 있다.
- 웹 MVP와 앱 MVP를 같은 기능 범위로 유지하기 쉽다.
- 사진 선택, 파일 공유, 앱 링크, 푸시 알림 같은 네이티브 기능을 필요한 만큼만 추가할 수 있다.
- 개인 개발자가 Flutter/React Native로 전체 재작성하는 것보다 출시 리스크가 낮다.

Flutter 또는 React Native는 다음 조건이 생겼을 때 재검토한다.

- 앱 사용의 대부분이 네이티브 카메라/갤러리/오프라인 처리로 이동한다.
- 웹과 앱 UI를 다르게 가져갈 필요가 커진다.
- WebView 기반 앱에서 성능, 인증, 파일 처리 한계가 실제로 검증된다.

### 앱에서 필요한 네이티브 기능

1차 앱:

- 사진 선택/촬영
- 파일 업로드 권한 문구
- 앱 내부 브라우저 또는 외부 브라우저로 제품 URL 열기
- OAuth redirect/deep link 처리
- Android 뒤로가기 처리
- iOS safe area 대응
- 앱 버전 표시

2차 앱:

- 푸시 알림
- 공유 시트에서 이미지/URL 받아 제품 초안 만들기
- 오프라인 변경 충돌 안내
- 위젯 또는 홈 화면 빠른 추가

앱 MVP에서 위치 권한은 필요 없다. 이 서비스는 옷장 기록 서비스이고, 위치 기능은 제품 정체성에 직접 필요하지 않다.

## 6. 데이터 모델 설계

### 현재 주요 테이블

현재 Supabase 스키마의 핵심은 다음이다.

```text
items
  id, user_id, name, product_url, memo,
  parent_category, category, brand, color,
  image_url, image_edit,
  size_label, shoe_size,
  retail_price, purchase_price, purchase_date,
  owned, rating, raw, created_at, updated_at

categories
  owner_id, parent_id, name, is_system, sort_order

colors
  owner_id, name, hex, is_system, sort_order

measurement_definitions
  owner_id, key, label_ko, default_unit, is_system

category_measurement_templates
  category_name, measurement_definition_id, importance, display_group, sort_order

item_measurements
  item_id, measurement_definition_id, custom_label, label, value, value_text, unit, source, source_name, notes, sort_order

item_images
  id, item_id, owner_id, storage_provider, storage_bucket, storage_path, width, height, mime, is_primary

share_snapshots
  owner_id, token, payload, is_active, expires_at
```

### 모델링 원칙

`items`는 사용자가 빠르게 입력하는 제품 카드의 중심이다. 상세 카테고리, 실측, 이미지처럼 확장 가능한 정보는 별도 테이블로 분리한다.

`categories`, `colors`, `measurement_definitions`는 시스템 기본값과 사용자 커스텀 값을 함께 다룬다. 따라서 `is_system`과 `owner_id` 구조를 유지한다.

`item_images`는 이미지 파일 자체가 아니라 locator를 저장한다. 이 구조는 Supabase Storage에서 R2/S3로 옮길 때 핵심 확장 지점이다.

`raw`는 CSV import나 레거시 호환을 위한 보조 필드다. 장기적으로 핵심 기능에서 읽는 값은 정규 컬럼으로 승격해야 한다.

### 추가 권장 테이블

공개 서비스 전에는 다음 테이블을 추가하는 것이 좋다.

```sql
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  note text
);

user_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  object_key text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

sync_events (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  item_id text,
  client_id text,
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);
```

### RLS 원칙

현재 `items`, `item_measurements`, `item_images`는 소유자 기준 RLS가 적용되어 있다. 이 원칙을 유지한다.

- 사용자 옷장 데이터는 기본 비공개다.
- 시스템 카테고리/색상/실측 정의는 읽기 가능하다.
- 사용자 커스텀 카테고리/색상/실측은 본인만 관리한다.
- 이미지 Storage path는 `auth.uid()` 폴더 아래로 제한한다.
- 공개 공유 기능을 다시 도입하기 전까지 anon read 정책을 넓히지 않는다.

## 7. 동기화/오프라인 설계

### 현재 구조

현재 앱은 IndexedDB를 1차 저장소로 쓰고, 로그인 상태에서는 Supabase에 queued change를 밀어 넣는다. 이 구조는 웹 MVP에 좋다.

장점:

- 게스트 모드가 빠르다.
- 네트워크가 불안정해도 로컬 데이터가 남는다.
- Supabase가 없어도 개인 도구로 사용할 수 있다.

위험:

- 여러 기기에서 같은 제품을 동시에 수정할 때 충돌 정책이 약하다.
- 사용자가 동기화 실패 상태를 알아차리기 어렵다.
- 로컬 IndexedDB quota, 브라우저 삭제, 앱 WebView storage 정책의 영향을 받는다.

### 권장 충돌 정책

MVP에서는 복잡한 merge보다 다음 정책을 명확히 한다.

- 제품 기본 정보: `updated_at`이 최신인 row를 우선한다.
- 실측: 제품 저장 시 해당 제품의 실측 전체를 replace한다.
- 이미지: 이미지 row는 append/delete 이벤트로 처리하고, primary flag만 마지막 변경을 우선한다.
- 삭제: 삭제 이벤트가 있으면 복원보다 삭제를 우선하되, 7~30일 복구 가능 상태를 검토한다.

앱 공개 전에는 "마지막 동기화", "동기화 대기", "동기화 실패", "재시도"를 마이페이지에 노출해야 한다.

## 8. 이미지 업로드/저장 설계

### 기본 원칙

이미지는 비용과 개인정보 리스크가 가장 큰 데이터다. 원본을 그대로 저장하지 않는다.

권장 기본값:

- 앱/웹에서 업로드 전 WebP 변환
- 긴 변 720px 기본
- 5MB 이하 업로드 제한
- EXIF 제거
- 정사각 썸네일 또는 카드용 캐시 생성
- 외부 이미지 URL은 다운로드하지 않고 URL 데이터로 저장

현재 저장소는 이미지 압축, 편집 정보, Supabase Storage 업로드, 원격 이미지 Blob 캐시를 갖고 있다. 앱 전환 시 Capacitor 환경에서 파일 선택/카메라 입력과 WebP 변환 동작을 검증해야 한다.

### 저장소 확장

단계별 권장:

1. 웹 MVP: Supabase Storage `wardrobe-images`
2. 비공개 베타: Supabase Storage + 이미지 리사이즈/Blob cache 유지
3. 공개 앱: Cloudflare R2 또는 S3로 이미지 저장소 분리 검토
4. 성장 단계: Cloudflare CDN/cache, 썸네일 Worker, lifecycle cleanup

현재 `item_images.storage_provider`, `storage_bucket`, `storage_path`는 이 전환을 위해 유지한다.

### R2 전환 기준

다음 중 하나에 해당하면 R2 전환을 검토한다.

- Supabase Storage 1GB Free 또는 100GB Pro 한도 접근
- Supabase egress가 월간 비용의 주된 원인이 됨
- 이미지 조회가 제품 상세/목록보다 훨씬 많은 트래픽을 만듦
- 썸네일/원본/백업 lifecycle을 Storage와 별도로 통제해야 함

R2는 egress가 무료지만 read request인 Class B operation은 비용이 생긴다. 따라서 R2로 옮겨도 CDN/cache와 썸네일 전략은 필요하다.

## 9. 인증/계정 설계

### 현재 로그인 조합

현재 구현은 게스트 모드와 Google OAuth를 제공한다. 공개 웹 MVP에서는 이 조합으로 충분하다.

앱 출시 시 추가 검토:

- iOS 앱에서 다른 소셜 로그인을 추가하면 Apple 로그인 요구사항을 확인해야 한다.
- Google OAuth redirect는 웹 URL과 앱 deep link를 모두 검증해야 한다.
- 게스트 데이터가 로그인 계정으로 자동 병합되는 것이 아니라, 사용자가 직접 가져오도록 하는 현재 방향을 유지한다.

### 계정 삭제

약관/개인정보처리방침에는 삭제 요청이 언급되어 있다. 공개 출시 전에는 제품 기능으로 연결해야 한다.

필수 요구사항:

- 마이페이지에서 `데이터 내보내기`
- `계정 데이터 삭제 요청`
- 삭제 전 재인증 또는 확인 문구
- 삭제 요청 접수 시점 기록
- items, item_measurements, item_images, Storage object 삭제
- 백업/로그 잔존 가능성에 대한 방침 안내

개인 개발자 MVP에서는 즉시 완전 자동 삭제보다 "요청 접수 + 운영자 처리 + 처리 결과 안내"로 시작할 수 있다. 다만 앱스토어 제출 전에는 실제 처리 방법과 연락처가 명확해야 한다.

## 10. 개인정보/법무 설계

### 처리하는 개인정보

현재 서비스가 처리하는 정보:

- Google 로그인 이메일, 표시 이름, 프로필 이미지 URL
- 제품명, 브랜드, 카테고리, 색상, 사이즈, 가격, 구매일, 평점, 메모, 실측
- 제품 이미지와 외부 이미지 URL
- 이미지 편집 정보
- 로컬 저장소/IndexedDB 데이터
- Supabase Auth/DB/Storage 로그

이 정보는 민감정보는 아니지만 개인의 소비 성향과 신체 치수 추정이 가능한 데이터다. 실측과 구매 금액은 사용자가 민감하게 받아들일 수 있으므로 기본 비공개와 백업 가능성을 명확히 해야 한다.

### 이미지 리스크

이미지에는 다음 리스크가 있다.

- 타 쇼핑몰 이미지 URL 또는 캡처 사용
- 인물이 포함된 착용 사진
- EXIF 위치정보
- 브랜드/쇼핑몰 저작권 이미지 저장
- 공개 공유 시 권리침해 신고

MVP에서는 개인 비공개 저장을 기본으로 하고, 공개 공유/피드 기능은 제외한다. 공유 기능을 다시 도입할 때는 신고, 삭제, 비공개 전환, 링크 만료가 먼저 필요하다.

### 필요한 문서

공개 웹/앱 출시 전 필요한 문서:

- 이용약관
- 개인정보처리방침
- 계정 삭제/데이터 삭제 안내
- 이미지 업로드 정책
- 문의/권리 행사 접수 경로
- 앱스토어 심사용 개인정보 수집 항목 정리
- 오픈소스 라이선스 고지

현재 `src/legal/legalContent.ts`에 초안이 있으나 실제 운영자명, 연락처, 시행일, 위탁/국외 이전 범위는 출시 전 확정해야 한다.

## 11. 기술 스택 추천

### 프론트엔드

현재 유지:

- Vite
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui 스타일 컴포넌트
- lucide-react / Tabler icons
- IndexedDB

신규 UI는 React/shadcn으로 만들고, 레거시 DOM은 기능 단위로 천천히 줄인다. 앱 전환 전 전체 재작성은 하지 않는다.

### 앱

권장:

- Capacitor
- iOS/Android native project 생성
- 같은 React build를 앱에 번들
- 앱별 환경값과 OAuth redirect 분리

보류:

- Flutter 전체 재작성
- React Native 전체 재작성
- 별도 네이티브 백엔드

### 백엔드

현재 유지:

- Supabase Auth
- Supabase Postgres
- Supabase RLS
- Supabase Storage

추가 권장:

- Supabase Edge Functions 또는 Cloudflare Workers

서버 함수로 분리할 대상:

- 이미지 presign/finalize
- 계정 삭제 요청 처리
- 백업 export job
- R2 업로드 토큰 발급
- 서버 측 analytics/event 수집
- 데이터 마이그레이션/정리 job

### 배포

웹:

- Cloudflare Pages 또는 동등한 정적 호스팅
- `npm run build`
- `dist/`
- Supabase Auth redirect URL 등록

앱:

- App Store Connect
- Google Play Console
- TestFlight / closed testing
- 앱 개인정보 항목과 데이터 삭제 URL 준비

## 12. Supabase 확장성 판단

### 2026-05-10 기준 확인한 공식 가격/쿼터

Supabase 공식 문서 기준으로 Free Plan은 2개 무료 프로젝트, 500MB DB, 50,000 MAU, 1GB Storage, 5GB uncached egress와 5GB cached egress, Edge Function 500,000 invocations를 제공한다. Pro는 월 $25부터 시작하며 8GB disk, 100GB Storage, 250GB uncached/cached egress, 100,000 MAU, Edge Function 2 million invocations가 기준이다.

Cloudflare R2 공식 문서 기준으로 Standard storage는 10GB-month, Class A 1 million, Class B 10 million requests가 무료이고, egress는 무료다. 다만 Class B read request는 무료 한도를 넘으면 과금되므로 이미지 서비스 비용이 0이 되는 것은 아니다.

앱스토어 비용은 Apple Developer Program $99/year, Google Play Console US$25 one-time registration fee가 기준이다.

가격과 쿼터는 변경될 수 있으므로 구현 직전 다시 확인한다.

공식 기준:

- Supabase billing and quotas: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase egress: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- Supabase storage pricing: https://supabase.com/docs/guides/storage/pricing
- Supabase Edge Functions pricing: https://supabase.com/docs/guides/functions/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Apple Developer Program: https://developer.apple.com/programs/
- Google Play Console registration: https://support.google.com/googleplay/android-developer/answer/6112435

### 단계별 인프라 판단

0단계 개발/검증:

- Supabase Free
- Supabase Storage
- Cloudflare Pages 무료 범위
- IndexedDB 게스트 우선
- 운영자 1인 수동 백업

1단계 웹 MVP/소규모 비공개 베타:

- Supabase Pro 전환 권장
- 자동 pause 제거
- 7일 백업/로그 확보
- Storage 사용량 모니터링
- 이미지 압축 강제
- 수동 SQL dump 백업

2단계 앱 공개:

- Supabase Pro 유지
- 이미지 트래픽 증가 시 R2 전환
- Edge Functions/Workers로 이미지 업로드와 계정 삭제 처리 분리
- Sentry 또는 동등한 오류 수집
- 앱스토어 심사 문서 정비

3단계 성장:

- Postgres index/쿼리 최적화
- read-heavy 분석은 집계 테이블 또는 materialized view 검토
- R2 + CDN/cache + 썸네일 Worker
- 관리자 도구
- 로그 drain 또는 외부 observability

### Free Plan만으로 운영하지 말아야 하는 이유

Free Plan은 개발/검증에는 적합하지만 공개 운영에는 다음 문제가 있다.

- 비활성 pause 가능성
- 자동 백업 부재
- 짧은 로그 보존
- Storage 1GB와 egress 5GB/5GB 한도
- 이미지 중심 앱에서 예측 어려운 트래픽
- 장애 대응 지원 한계

따라서 공개 웹 MVP부터는 Supabase Pro를 기준 예산으로 잡고, Free는 개발/검증 환경으로 분리한다.

## 13. 비용 구조

### 초기 개발

예상:

- Supabase Free
- Cloudflare Pages 무료 범위
- R2 미사용 또는 무료 범위
- 앱스토어 계정 없음
- 월 0원에 가깝게 가능

주의:

- 실제 사용자 이미지를 많이 넣으면 Free Storage/egress가 먼저 한계가 된다.

### 비공개 베타

예상:

- Supabase Pro: 월 $25부터
- Cloudflare Pages: 무료 또는 낮은 비용
- R2: 필요 시 무료 범위 또는 소액
- 도메인: 별도
- 오류 수집: 무료 티어 우선

### 앱스토어 출시

예상:

- Supabase Pro: 월 $25부터
- Apple Developer Program: $99/year
- Google Play Console: US$25 one-time
- R2/Storage: 이미지 사용량에 따라 증가
- 이메일/문의/도메인/모니터링: 별도

### 비용 폭증 지점

- 원본 이미지 저장
- 썸네일 없이 큰 이미지를 목록에서 반복 로드
- signed URL을 너무 자주 재발급
- 외부 이미지 URL을 서버가 프록시/다운로드
- 분석 화면에서 모든 row를 매번 전체 로드
- 앱 시작 시 불필요한 full sync
- 로그/백업을 무제한 보관

## 14. 운영 워크플로우

### 데이터 백업

운영자는 다음 백업 레이어를 가져야 한다.

- 사용자 직접 CSV/JSON/ZIP 내보내기
- Supabase Pro daily backup
- 정기 SQL dump
- Storage/R2 object lifecycle
- schema migration SQL versioning
- 배포 전 schema diff 확인

### 계정 삭제 처리

권장 플로우:

1. 사용자가 마이페이지에서 데이터 내보내기 안내를 확인한다.
2. 계정 삭제 요청을 누른다.
3. 재확인 문구와 처리 범위를 확인한다.
4. `account_deletion_requests`에 요청을 기록한다.
5. 운영자 또는 job이 DB row와 object를 삭제한다.
6. 처리 결과를 이메일 또는 앱 내 상태로 안내한다.

### 이미지 정리

권장 플로우:

1. 삭제된 item의 item_images를 조회한다.
2. object 삭제 queue를 만든다.
3. Storage/R2 object 삭제를 실행한다.
4. 실패 항목은 retry한다.
5. 일정 기간 이상 orphan object를 탐지한다.

### 문의/권리 요청

개인 개발자 MVP에서는 모든 문의를 자동화할 필요는 없다. 다만 다음은 있어야 한다.

- 문의 이메일
- 데이터 삭제 요청 접수 방법
- 이미지 권리침해 요청 접수 방법
- 처리 상태 기록
- 반복 이슈를 문서화하는 운영 메모

## 15. 핵심 지표

제품 지표:

- 첫 제품 저장 완료율
- 첫 제품 저장까지 걸린 시간
- 7일 내 두 번째 제품 저장률
- 제품당 평균 입력 필드 수
- 제품당 이미지 첨부율
- 검색 사용률
- 필터 사용률
- 분석 화면 재방문율

데이터 지표:

- 사용자당 제품 수
- 사용자당 이미지 수
- 가격 누락률
- 카테고리 누락률
- 브랜드 누락률
- 실측 입력률
- CSV import 성공률
- 백업 export 사용률

운영 지표:

- 동기화 실패율
- pending sync 평균 체류 시간
- Supabase egress
- Supabase storage size
- 이미지 cache hit 추정
- 계정 삭제 요청 처리 시간
- 앱 crash-free session

## 16. 출시 로드맵

### 0단계: 현재 웹 MVP 정리

목표: 현재 웹 앱을 공개 가능한 MVP 후보로 만든다.

필수:

- README와 PRD 정렬
- 계정 삭제/데이터 삭제 플로우 설계
- 동기화 상태 UI 보강
- 이미지 제한과 EXIF 제거 확인
- 앱 내 법무 문서의 운영자 정보 확정
- `npm run build` 정기 검증
- 모바일 실기기 검증

### 1단계: 웹 비공개 베타

목표: 실제 사용자가 옷 30~100개를 넣을 때 계속 쓸 수 있는지 확인한다.

기능:

- Google 로그인 동기화
- 게스트 데이터 가져오기
- CSV import/export
- JSON/ZIP 백업
- 분석 대시보드
- 데이터 삭제 요청 접수

검증:

- 첫 저장 완료율
- 이미지 첨부 실패율
- 동기화 실패율
- CSV import 오류 유형
- 분석 화면 성능
- 모바일 Safari/Chrome 동작

### 2단계: 앱 셸 베타

목표: 같은 웹 기능을 iOS/Android 앱에서 안정적으로 제공한다.

기능:

- Capacitor 앱 셸
- 사진 선택/촬영
- OAuth redirect/deep link
- Android 뒤로가기
- safe area
- 앱 버전/문의/정책 링크

검증:

- 앱 설치 후 첫 실행
- 게스트 저장 지속성
- 로그인 callback
- 이미지 업로드
- 오프라인 상태 저장
- 앱 재시작 후 동기화

### 3단계: 앱스토어 출시

목표: 개인 개발자가 운영 가능한 범위로 공개 출시한다.

필수:

- App Store/Google Play 개인정보 항목 작성
- 계정 삭제 URL 또는 앱 내 삭제 요청 플로우
- 문의 이메일
- 약관/개인정보처리방침 실제 정보 확정
- 앱 아이콘/스크린샷
- TestFlight/closed testing
- Supabase Pro 운영 환경

### 4단계: 앱 고유 가치 강화

후보:

- 공유 시트에서 제품 URL/이미지로 초안 생성
- 계절 전환 리마인드
- "비슷한 옷 이미 있음" 로컬 분석
- 사이즈/실측 기반 브랜드 메모
- 정리 후보 리스트
- 선택적 옷장 공유

공개 소셜/AI 추천은 이 단계 이후에 실제 사용 데이터와 운영 여력이 생긴 뒤 판단한다.

## 17. MVP에서 하지 말아야 할 것

### 네이티브 전체 재작성

현재 웹 앱의 기능 범위가 이미 넓다. 앱 출시를 이유로 Flutter/React Native로 전체 재작성하면 출시가 늦어지고, 웹 접근성도 약해진다.

### 공개 소셜 기능

옷장 데이터는 개인적이다. 공개 피드, 댓글, 팔로우는 신고/차단/저작권/초상권/스팸 대응을 요구한다. MVP에서는 개인 비공개 기록을 먼저 완성한다.

### AI 코디 추천

데이터가 적은 초기에는 추천 품질보다 입력/검색/분석 품질이 더 중요하다. AI 기능은 사용자가 충분한 옷장 데이터를 넣고 난 뒤, 보조 기능으로만 붙인다.

### 원본 이미지 저장

이미지 비용과 개인정보 리스크가 커진다. 업로드 전 압축/리사이즈/EXIF 제거를 기본으로 한다.

### 쇼핑몰/가격 추적

외부 크롤링, 제휴, 상품 DB, 가격 변동 추적은 운영 부담이 크다. 제품 URL 저장 정도로 제한한다.

### 복잡한 공동 편집

가족/커플 공유는 매력적이지만 권한, 충돌, 삭제 책임이 복잡하다. 단기 MVP에는 넣지 않는다.

## 18. 당장 정해야 할 오픈 이슈

1. 앱 1차 구현을 Capacitor로 확정할지
2. 공개 웹 MVP부터 Supabase Pro로 갈지, 비공개 베타까지만 Free로 둘지
3. 이미지 저장소를 언제 R2로 분리할지
4. 계정 삭제를 자동 처리로 갈지, 요청 접수 후 수동 처리로 시작할지
5. 운영자명/문의 이메일/개인정보 보호책임자 정보를 어떻게 표기할지
6. 앱 출시 전 Apple 로그인 필요 여부를 어떻게 판단할지
7. `share_snapshots`를 장기적으로 제거할지, 향후 옷장 공유 기능의 기반으로 보류할지
8. 레거시 `assets/js/app.js`를 앱 출시 전 어디까지 React/모듈로 이관할지
9. 초기 베타 사용자의 데이터 import 포맷을 현재 한국어 CSV로 고정할지
10. 앱 아이콘/브랜드 표기를 `자아앙`/`Jaaang`으로 확정할지

권장 답:

- 앱 1차는 Capacitor.
- 공개 운영은 Supabase Pro 기준.
- R2는 공개 앱 이후 이미지 지표를 보고 전환하되 provider abstraction은 지금 유지.
- 계정 삭제는 MVP에서 요청 접수 + 수동 처리로 시작하고, 로그를 남긴다.
- 법무 문서의 운영자 정보는 앱스토어 제출 전 실제 정보로 확정한다.
- Apple 로그인은 iOS 앱에서 Google 외 제3자 로그인을 제공하는 시점에 심사 기준을 재검토한다.
- 공유 기능은 MVP에서 제외하고 `share_snapshots`는 당장 노출하지 않는다.
- 레거시 런타임은 출시 전 전체 제거가 아니라 동기화/이미지/백업 경계부터 분리한다.

## 19. 요구사항 커버리지 체크

| 요청/요구사항 | 반영 위치 | 상태 |
| --- | --- | --- |
| `coffee`처럼 자세한 서비스 설계 | 전체 문서 구조 | 완료 |
| 현재 웹으로 구성된 `옷장` 기능 확인 | 1, 3, 4, 6, 7 | 완료 |
| 앱으로 만들되 웹으로도 접근 가능 | 0, 5, 11, 16 | 완료 |
| Supabase Free Plan 하나에 묶인 현재 구조 고려 | 0, 8, 12, 13 | 완료 |
| 확장성 고려 | 5, 6, 7, 8, 11, 12 | 완료 |
| 서비스 전체 기능 정리 | 1, 3, 4 | 완료 |
| 설계 PRD 신규 구성 | 전체 문서 | 완료 |
| 웹 MVP로 시작 후 앱 출시 | 3, 5, 16 | 완료 |
| 비용/요금 기준 확인 | 12, 13 | 완료 |
| 운영/법무 리스크 포함 | 10, 14, 17 | 완료 |
