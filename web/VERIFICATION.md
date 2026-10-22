# 작업자 B 웹 검증 결과

검증일: 2026-10-22 (한국 시간). 구현 커밋: `38f458d2c29b5fdab78735850deb2fee59d00bf0`.

## 담당 합격 기준

| 항목 | expected | observed | passed |
| --- | --- | --- | --- |
| 1. 단위 테스트 | `npm test` 전체 통과 | Vitest 4개 파일, 20개 테스트 통과 | true |
| 2. 빌드·버전 | `npm run build` 성공, `dist/version.json`의 commit·UTC built_at | TypeScript 검사와 Vite 빌드 성공; 아래 버전 JSON 확인 | true |
| 3. 브라우저 | 데스크톱·375px 통과, console error 0, 가로 넘침 없음, 스크린샷 2개 | Playwright 2 passed, 0 skipped, 0 unexpected, 0 flaky; 두 프로젝트 consoleErrors/pageErrors 모두 빈 배열 | true |
| 4. 의존성 | 모든 직접 의존성 버전 정확 고정, lockfile 커밋 | 8개 의존성 모두 숫자 3자리 semver 고정; package-lock.json 커밋; 새 격리 폴더에서 npm ci 성공 | true |
| 5. 실제 데이터 | A가 커밋한 JSON으로 빌드·브라우저 검증 | 데이터 커밋 `23ab226`; 239개 역; public과 dist SHA-256 일치; E2E가 HTTP JSON과 실제 파일 전체를 비교 | true |
| 6. 작업 파일 상태 | 담당 파일에 미커밋 변경 없음 | 구현 커밋 직후 `git status --porcelain -- web` 출력 없음; 보고서도 별도 담당 경로 커밋 | true |

## 실행한 명령과 관찰

작업 디렉터리: `C:/Users/xoxox/orca/projects/seoul-commercial-analysis/web`.

```text
node --version  -> v24.16.0
npm --version   -> 11.13.0
npm install --no-fund -> added 47 packages, audited 48, 0 vulnerabilities
npx playwright install chromium -> Chromium 1248 및 관련 도구를 web/.cache/ms-playwright에 설치
npm test        -> Test Files 4 passed (4), Tests 20 passed (20)
npm run build   -> tsc --noEmit && vite build && node scripts/write-version.mjs 성공
npx playwright test -> 2 passed (4.4s)
git diff --check -- web -> 오류 없음
git ls-files --error-unmatch web/package-lock.json -> web/package-lock.json
git status --porcelain -- web -> 출력 없음 (구현 커밋 직후)
```

lockfile의 새 설치도 확인했습니다. PowerShell에서 `web/.cache/lockcheck-<고유 GUID>`를 생성하고 package.json과 package-lock.json만 복사한 뒤 `npm ci --prefix $validationDirectory --cache .cache/npm --no-fund`를 실행했습니다. 결과는 47개 설치, 48개 검사, 취약점 0건입니다. 검증 폴더와 이전 산출물은 삭제하지 않았습니다.

최종 브라우저 검증에서 HTTP로 읽은 버전은 다음과 같습니다. 이후 빌드의 값은 해당 시점 HEAD와 생성 시각으로 갱신됩니다.

```json
{
  "commit": "38f458d2c29b5fdab78735850deb2fee59d00bf0",
  "built_at": "2026-10-22T08:34:11.710Z"
}
```

## 브라우저 근거

결과 파일: [results.json](test-results/run-2026-10-22T08-34-22-288Z-29996/results.json).

- [데스크톱 1440×1000, 라이트 모드 스크린샷](test-results/run-2026-10-22T08-34-22-288Z-29996/artifacts/smoke-실제-데이터로-역-검색·상세·업종-추천을-탐색한다-desktop/desktop.png)
- [모바일 375×812, 다크 모드 스크린샷](test-results/run-2026-10-22T08-34-22-288Z-29996/artifacts/smoke-실제-데이터로-역-검색·상세·업종-추천을-탐색한다-mobile-375/mobile-375.png)

두 프로젝트에서 페이지 로드, 실제 stations·summary JSON 전체 동등성, 요약 통계, 마커 239개, Enter 키 검색 선택, 유동인구·매출 순위·격차·판정·근거, 차트 수치 표, 검색 결과 없음과 초기화, 업종 필터의 추천 순서, 추천·마커를 통한 상세 선택, version.json, `document.documentElement.scrollWidth <= innerWidth`를 검사했습니다. `consoleErrors=[]`, `pageErrors=[]`입니다.

지도 타일만 테스트 route로 PNG 응답을 제공했습니다(데스크톱 18회, 모바일 10회). 앱 스크립트·JSON은 대체하지 않았고 콘솔 오류를 필터링하지 않았습니다. 따라서 스크린샷의 지도 배경은 실제 OSM 지도 이미지가 아닙니다. 실제 앱은 OSM 타일과 attribution을 사용하고 타일 오류 시 안내를 표시합니다.

첫 브라우저 실행은 Windows의 예약 포트 `4142~4241`에 속하는 4178에서 `EACCES`로 실패했습니다. `netsh interface ipv4 show excludedportrange protocol=tcp`로 원인을 확인하고 앱 미리보기·테스트 포트를 4273으로 변경한 뒤 통과했습니다. 보안 설정이나 기존 서버는 변경하지 않았습니다.

## 데이터 연결 근거

- 데이터 커밋 확인: `git log --oneline -- web/public/data/stations.json web/public/data/summary.json` → `23ab226 feat: build reproducible Seoul station analysis data`.
- 실제 지하철 기준월: `202605`; 요청 월과 동일, `subway_substituted=false`.
- 매출 기간: `2025년 1~4분기 합계 (20251, 20252, 20253, 20254)`.
- 생성 시각: `2026-10-22T08:18:36.776203Z`.
- 분석 역: 239개, 판정 임계값: 24단계.
- 재계산 R²: `0.1641505764582242`; ρ: `0.575462360676488`.
- README 기존 R²: `0.164`; ρ: `0.574`. 화면은 두 수치와 A가 기록한 차이 설명을 모두 표시합니다. 원본 실행 해시가 없어 차이 원인을 확정할 수 없다는 내용도 그대로 표시합니다.

| 역 | 일평균 승하차(명) | 유동인구 순위 | 매출(억원) | 매출 순위 | gap | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 강남 | 147675.51612903227 | 1 | 16452.15630717 | 2 | +1 | 보통 |
| 혜화 | 79535.45161290323 | 11 | 13.79167067 | 232 | +221 | 거품 |
| 고덕 | 19857.225806451614 | 158 | 2977.2113535 | 31 | -127 | 알짜 |

public 파일과 dist 복사본을 각각 `Get-FileHash -Algorithm SHA256`으로 확인했습니다.

| 파일 | public와 dist의 동일 SHA-256 |
| --- | --- |
| stations.json | `3964ABF648EC7C529FC5D68E24F95635AD6E7A98DFF0E43584EBB987AEBDAB24` |
| summary.json | `AA054ABB8A4F597A6537A4BD3F5810B2E924F95EE5FCE0E5CEE8801E63B58C06` |

## 변경 범위와 남은 한계

변경 파일은 `web/`의 다음 28개이며 A 소유 `public/data/*.json`은 수정·스테이징하지 않았습니다.

```text
web/.gitignore
web/.npmrc
web/README.md
web/VERIFICATION.md
web/index.html
web/package-lock.json
web/package.json
web/playwright.config.ts
web/public/favicon.svg
web/scripts/install-browsers.mjs
web/scripts/write-version.mjs
web/src/chart.ts
web/src/lib/data.test.ts
web/src/lib/data.ts
web/src/lib/format.test.ts
web/src/lib/format.ts
web/src/lib/load.test.ts
web/src/lib/load.ts
web/src/lib/types.ts
web/src/main.ts
web/src/map.ts
web/src/style.css
web/src/views.test.ts
web/src/views.ts
web/tests/e2e/smoke.spec.ts
web/tests/fixtures/data.ts
web/tsconfig.json
web/vite.config.ts
```

담당 필수 항목은 모두 통과했습니다. 외부 push·배포·GitHub 쓰기를 수행하지 않았고 실제 호스팅·GitHub Actions 실행은 검증하지 않았습니다. 로컬 검증 환경은 Windows/Node 24이며 Linux/Node 22 CI는 아직 실행 전입니다. 실제 데이터는 모든 역에 좌표가 있어서 좌표 누락 처리는 합성 fixture의 단위 테스트로 확인했습니다. 공개 타일의 실시간 가용성과 데이터 분석 자체의 정확성은 프런트엔드 검증 범위를 벗어나며 A·C 및 코디네이터의 검증과 구분합니다.
