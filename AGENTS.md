# 개발
- 모든 기능을 하나의 파일에 담지 말고 기능별로 분리해서 재활용성을 높여야 합니다.
- 모바일과 데스크톱에서 모두 사용할 수 있도록 해야하며, 사용자의 사용성을 고려해서 개발해야 합니다.
- 개발 서버 로그는 `artifacts/logs/`, 검증용 스크린샷은 `artifacts/screenshots/`에 저장하고 루트에는 생성물을 두지 않습니다.

# 확장성과 운영 비용
- Supabase는 인증, Postgres, RLS, 초기 Storage 연동의 기본 플랫폼으로 유지하되, 이미지 트래픽이 커질 수 있으므로 이미지 저장소 의존성은 반드시 `assets/js/closet-image-provider-utils.js`를 통해 분리합니다.
- 새 이미지 저장/조회 코드는 Supabase 버킷명이나 signed URL 생성을 직접 하드코딩하지 말고 `imageStorageConfig`, `normalizeImageLocator`, `remoteImageFromRecord`, `remoteImageUrl` 같은 provider 유틸을 사용합니다.
- 원격 이미지 메타데이터에는 `storageProvider`, `storageBucket`, `storagePath`를 함께 남겨야 합니다. Supabase 스키마의 `item_images.storage_provider`, `storage_bucket`, `storage_path`는 나중에 R2/S3 같은 오브젝트 스토리지로 옮기기 위한 중립적인 locator입니다.
- 비용 최적화는 이미지 품질을 과도하게 낮추는 방식보다 캐싱과 전송량 절감을 우선합니다. 원격 이미지는 IndexedDB Blob 캐시를 먼저 활용하고, 원격 URL은 캐시 실패 시 fallback으로만 사용합니다.
- 이미지 저장소를 R2/S3 등으로 교체할 때도 Supabase Auth/Postgres는 유지할 수 있게 DB 동기화 로직과 이미지 provider 구현을 분리해서 변경합니다.
- 공개 공유, 피드, 검색 유입처럼 비로그인 이미지 조회가 늘어나는 기능을 만들 때는 egress/스토리지 사용량을 먼저 추정하고, 필요하면 이미지 provider 교체나 CDN 캐시 정책을 함께 설계합니다.

# 브랜드
- 공식 서비스명은 `자아앙`으로 사용합니다.
- 영문 보조 표기는 `Jaaang`으로 사용합니다.
- 브랜드 문구는 `나의 작은 옷장`으로 사용합니다.
- `자아앙`은 옷장의 `장` 소리를 늘려 만든 이름이며, 개인적인 옷장 공간이라는 의미를 담습니다.
- 문서 타이틀, PWA 매니페스트 등 메타 영역의 대표 명칭은 `자아앙`을 우선 적용합니다.
- 홈 상단, 로그인 로고, 공유 화면처럼 앱 안에서 사용자가 보는 브랜드 표기는 `자아앙`을 우선 적용합니다.
- 로그인이나 소개 영역처럼 보조 설명이 필요한 곳에는 `나의 작은 옷장`을 함께 사용합니다.
