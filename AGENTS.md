# 개발
- 모든 기능을 하나의 파일에 담지 말고 기능별로 분리해서 재활용성을 높여야 합니다.
- 모바일과 데스크톱에서 모두 사용할 수 있도록 해야하며, 사용자의 사용성을 고려해서 개발해야 합니다.
- 개발 서버 로그는 `artifacts/logs/`, 검증용 스크린샷은 `artifacts/screenshots/`에 저장하고 루트에는 생성물을 두지 않습니다.

# 개발 서버 운영
- 이 프로젝트의 dev 서버는 한글 경로에서 안정적으로 실행되도록 `npm run dev`가 `scripts/vite-dev.cjs` 래퍼를 통해 Vite를 실행합니다.
- 새 dev 서버를 띄우기 전에 항상 `npm run dev:status`로 5176-5190 범위의 기존 서버를 확인하고, 이 프로젝트의 기본 포트인 5176 서버가 있으면 그 URL을 재사용합니다.
- `npm run dev`는 기본적으로 `127.0.0.1:5176`을 사용하며, 해당 포트에 서버가 있으면 새 Vite 프로세스를 만들지 않고 재사용 안내만 출력합니다.
- Vite HMR이 소스 변경을 반영하므로 일반적인 코드 수정, CSS 수정, 컴포넌트 수정 때문에 dev 서버를 재시작하지 않습니다.
- dev 서버 재시작은 의존성 설치/삭제, `vite.config.ts`, 환경 변수, `config.js`, 서비스 워커/캐시 동작처럼 서버 시작 시점의 설정이 바뀐 경우에만 수행합니다.
- 별도 worktree나 격리 검증 때문에 추가 서버가 꼭 필요하면 `npm run dev -- --port <포트> --log-label <작업명> --no-reuse`처럼 명시 포트와 작업명을 사용합니다. 작업이 끝나면 해당 프로세스를 종료합니다.
- 포트가 이미 사용 중일 때 Vite가 자동으로 다음 포트로 넘어가면 서버가 누적되므로, 포트 점프에 의존하지 말고 기존 서버 재사용 또는 명시 포트 선택으로 처리합니다.
- 빌드 검증만 필요할 때는 dev 서버를 새로 켜지 말고 `npm run build`를 사용합니다.

# 병렬 에이전트 작업과 Git worktree
- 여러 agent를 동시에 돌릴 때는 같은 작업 디렉터리를 공유하지 말고, agent마다 별도의 `git worktree`와 전용 브랜치를 만들어 작업합니다.
- 기본 흐름은 `git fetch` 후 기준 브랜치(`main` 또는 사용자가 지정한 브랜치)에서 agent별 브랜치를 만들고, `../worktrees/<task-name>` 형태의 분리된 경로에 체크아웃하는 방식으로 진행합니다.
- 브랜치명은 `agent/<작업명>` 또는 `codex/<작업명>`처럼 작업 범위가 드러나게 짓고, 한 agent가 소유한 파일/모듈 범위를 작업 시작 전에 명확히 나눕니다.
- 서로 다른 agent가 같은 파일을 수정해야 하는 작업은 병렬화하지 말고 선후 관계를 정합니다. 불가피하면 한 agent가 구조 변경을 먼저 끝내고, 다른 agent는 그 결과를 기준으로 이어서 작업합니다.
- 통합은 한 worktree에서만 담당합니다. 통합 담당 worktree에서 각 agent 브랜치를 순서대로 병합하거나 cherry-pick하고, 충돌 해결과 최종 검증을 한 번에 수행합니다.
- agent 작업 중에는 다른 agent의 변경을 되돌리는 `git reset --hard`, `git checkout -- <file>`, 강제 push를 사용하지 않습니다. 필요하면 새 worktree를 만들거나 통합 담당자가 충돌을 해결합니다.
- 작업이 끝난 agent worktree는 브랜치가 병합된 뒤 `git worktree remove <path>`로 정리하고, 필요 없어졌다면 해당 agent 브랜치도 삭제합니다.

# 확장성과 운영 비용
- Supabase는 인증, Postgres, RLS, 초기 Storage 연동의 기본 플랫폼으로 유지하되, 이미지 트래픽이 커질 수 있으므로 이미지 저장소 의존성은 반드시 `assets/js/closet-image-provider-utils.js`를 통해 분리합니다.
- 새 이미지 저장/조회 코드는 Supabase 버킷명이나 signed URL 생성을 직접 하드코딩하지 말고 `imageStorageConfig`, `normalizeImageLocator`, `remoteImageFromRecord`, `remoteImageUrl` 같은 provider 유틸을 사용합니다.
- 원격 이미지 메타데이터에는 `storageProvider`, `storageBucket`, `storagePath`를 함께 남겨야 합니다. Supabase 스키마의 `item_images.storage_provider`, `storage_bucket`, `storage_path`는 나중에 R2/S3 같은 오브젝트 스토리지로 옮기기 위한 중립적인 locator입니다.
- 비용 최적화는 이미지 품질을 과도하게 낮추는 방식보다 캐싱과 전송량 절감을 우선합니다. 원격 이미지는 IndexedDB Blob 캐시를 먼저 활용하고, 원격 URL은 캐시 실패 시 fallback으로만 사용합니다.
- 이미지 저장소를 R2/S3 등으로 교체할 때도 Supabase Auth/Postgres는 유지할 수 있게 DB 동기화 로직과 이미지 provider 구현을 분리해서 변경합니다.
- 공개 공유, 피드, 검색 유입처럼 비로그인 이미지 조회가 늘어나는 기능을 만들 때는 egress/스토리지 사용량을 먼저 추정하고, 필요하면 이미지 provider 교체나 CDN 캐시 정책을 함께 설계합니다.

# 브랜드
- 브랜드의 단일 출처는 `src/brand/brandConfig.ts`의 `BRAND_CONFIG`입니다.
- 서비스명, 영문 보조 표기, 브랜드 문구를 새로 쓰거나 수정할 때는 AGENTS.md에 별도로 적힌 문자열을 기준으로 삼지 말고 `BRAND_CONFIG.serviceName`, `BRAND_CONFIG.englishName`, `BRAND_CONFIG.tagline` 값을 확인해서 일관성을 유지합니다.
- 홈 상단, 로그인 로고, 공유 화면, 문서 타이틀, PWA 매니페스트처럼 사용자가 보거나 메타 영역에 노출되는 브랜드 표기는 가능한 한 `BRAND_CONFIG`에서 가져옵니다.
- 브랜드의 유래나 설명 문구가 필요하면 `BRAND_CONFIG` 주변의 브랜드 관리 코드 또는 별도 브랜드 문서에 먼저 추가한 뒤, UI와 문서가 같은 출처를 참조하게 합니다.
