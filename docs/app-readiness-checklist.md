# 앱화 전 핵심 정리 체크리스트

작성일: 2026-05-10

이 문서는 자아앙을 웹 MVP에서 iOS/Android 앱으로 옮기기 전에 끝내야 하는 항목을 현재 코드 상태 기준으로 나눈다.

## 현재 처리 완료

- 기준 설계 문서: `docs/service-design.md`
- 마이페이지 동기화 상태 보강: 대기 작업 수, 최근 동기화 시각, 수동 동기화/재시도
- 게스트 데이터 초기화: 현재 브라우저의 게스트 IndexedDB 데이터 삭제
- 로그인 계정 옷장 데이터 삭제: Supabase DB row, Supabase Storage object, 로컬 IndexedDB 데이터 삭제
- 계정 삭제 요청 접수: `account_deletion_requests` 테이블과 RLS, 마이페이지 접수 버튼
- 이미지 저장소 교체 경계: `item_images.storage_provider`, `storage_bucket`, `storage_path` 유지
- 공개 공유 기능: 앱 MVP 범위에서 제외, `share_snapshots`는 런타임 노출 없이 보류

## 앱 프로젝트 생성 전에 확인

- `npm run build`가 깨지지 않아야 한다.
- 모바일 웹에서 `/`, `/analysis`, `/my`, `/login`, `/terms`, `/privacy`가 모두 렌더링되어야 한다.
- Google OAuth callback URL에 웹 배포 도메인과 앱 deep link 전략을 분리해 정리한다.
- iOS 앱에서 Google 로그인을 유지한다면 Sign in with Apple 필요 여부를 App Review Guideline 4.8 기준으로 확인한다.
- 앱 빌드용 환경값은 웹 배포용 `config.js`와 분리한다.

## 앱 셸에서 처리할 항목

- Capacitor 프로젝트 생성
- iOS/Android app id, app name, icon, splash 설정
- 사진 선택/촬영 권한 문구
- Android 뒤로가기에서 상세 모달 닫기 우선 처리
- iOS safe area와 하단 내비게이션 겹침 확인
- 앱 내부/외부 브라우저로 제품 URL 열기 정책 확인
- 앱 버전과 빌드 번호를 마이페이지에 표시

## 서버/운영으로 넘길 항목

- 계정 자체 삭제는 클라이언트에서 처리하지 않는다. Supabase Auth 사용자 삭제에는 server-side admin 권한이 필요하므로 Edge Function 또는 운영자 처리 플로우가 필요하다.
- 계정 삭제 요청 처리 job은 `account_deletion_requests.status`를 기준으로 별도 구현한다.
- 이미지 저장소를 R2/S3로 옮길 경우 현재 런타임은 provider locator만 준비되어 있으므로 presign/finalize 서버 함수가 필요하다.
- Supabase Free Plan은 공개 운영 기준이 아니다. 공개 베타 또는 앱스토어 출시 전에는 Supabase Pro와 백업 정책을 확정한다.

## 앱 MVP에서 제외

- 공개 옷장 피드
- 팔로우, 댓글, DM
- 코디 AI 추천
- 쇼핑몰 가격 추적
- 중고거래 등록
- 공동 편집
- 공개 공유 링크 재도입

