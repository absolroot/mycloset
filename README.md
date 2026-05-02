# Closet

PC와 모바일에서 관리하는 개인 옷장 PWA입니다.

현재 UI는 Vite React 셸과 shadcn/ui 컴포넌트를 기준으로 구성되어 있고, 기존 CSV/IndexedDB/Supabase 동기화 로직은 `assets/js/app.js`에서 유지합니다.

## 실행

이 폴더 경로에서 시스템 Node 22가 일부 node_modules CLI를 비정상 종료시키는 문제가 있어, 검증은 Node 20 런타임으로 실행했습니다.

```powershell
npx -p node@20 -p npm@10 npm run dev -- --port 5176
```

현재 개발 서버:

```text
http://localhost:5176
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

## 구현 상태

- CSV 자동 가져오기
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
