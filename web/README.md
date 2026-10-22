# 서울 상권 탐색 프런트엔드

Vite + TypeScript로 만든 정적 화면입니다. `public/data/stations.json`, `summary.json`은 루트 데이터 파이프라인에서 생성한 실제 분석 결과이며 프런트엔드에서 수정하지 않습니다. 테스트 fixture는 `tests/fixtures/`에만 있고 앱에 포함되지 않습니다.

## 실행

Node.js 22.12 이상인 22 LTS 또는 24 LTS와 npm을 사용합니다. 저장소 루트에서 실행합니다.

```sh
cd web
npm ci
npm run dev
```

개발 주소는 `http://127.0.0.1:5173/seoul-commercial-analysis/`입니다.

```sh
npm test
npm run build
npm run preview
```

빌드 미리보기 주소는 `http://127.0.0.1:4273/seoul-commercial-analysis/`입니다. 이 Windows 환경은 기본 Vite 미리보기 포트 4173이 포함된 4142~4241 범위를 예약하고 있어 4273을 사용합니다. 기존 빌드 파일은 자동 삭제하지 않습니다. `dist/index.html`이 현재 빌드의 해시 파일을 가리키고 이전 해시 파일은 남습니다.

## 브라우저 검증

```sh
npm run install:browsers
npx playwright test
```

`install:browsers`는 Playwright의 무료 `install chromium` 명령을 실행하며 브라우저를 `web/.cache/ms-playwright/`에 설치합니다. 일반 `npx playwright install chromium` 설치도 지원합니다. 로컬 설치를 직접 실행할 때는 PowerShell에서 다음처럼 경로를 지정할 수 있습니다.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache\ms-playwright'
npx playwright install chromium
```

테스트는 실제 커밋된 JSON과 빌드에서 응답한 JSON이 같은지 검사한 뒤 데스크톱 1440px(라이트), 모바일 375px(다크)에서 검색, 키보드 선택, 순위·근거·차트, 업종 추천, 지도 마커, `version.json`, 가로 넘침 및 브라우저 오류를 확인합니다. OSM 타일 이미지에 한해서 테스트 응답을 사용하며 앱 오류는 제외하지 않습니다. 지도 타일의 실제 네트워크 가용성은 이 테스트가 증명하지 않습니다.

실행별 고유 디렉터리 `test-results/run-*/`에 JSON 결과와 두 스크린샷을 남기므로 이전 검증 기록을 보존합니다. 경로가 사용 중이면 기존 서버를 재사용하거나 중지하지 않고 실패합니다. `SEOUL_E2E_PORT` 환경 변수로 다른 포트를 지정할 수 있습니다.

## 구조와 데이터 표시

- `src/lib/`: 검색, 업종 매출순 추천, 포맷, 화면 데이터 검증과 타입.
- `src/views.ts`: 한국어 화면과 출처·집계 범위. 외부 문자열을 HTML 이스케이프합니다.
- `src/map.ts`: Leaflet + OSM, 좌표가 없는 역을 제외한 마커. 목록은 모든 역을 유지합니다.
- `src/chart.ts`: Chart.js의 가로 막대 차트. 수치 표도 제공합니다.
- `src/main.ts`: 데이터 로딩, 선택 상태와 이벤트 연결.
- `src/style.css`: 반응형, 시스템 다크 모드, 키보드 포커스.
- `scripts/write-version.mjs`: 빌드 성공 후 `dist/version.json`에 `GITHUB_SHA` 또는 현재 Git HEAD와 UTC 생성 시각을 기록합니다. Git 조회에 실패하면 `unknown`입니다.

데이터는 `import.meta.env.BASE_URL + 'data/...'`로 불러옵니다. `vite.config.ts`의 base는 `/seoul-commercial-analysis/`입니다. 알짜·거품은 서버에서 계산한 판정과 임계값을 그대로 표시하고, 업종 추천은 선택 업종의 매출이 있는 역을 매출 내림차순으로 정렬합니다. README 참조 수치와 재계산 수치가 다르면 둘 다와 원본 차이 설명을 표시하며 기준월 대체 시 별도 안내를 표시합니다.

적용한 공식 문서: [Vite 프로젝트 경로와 미리보기](https://vite.dev/guide/static-deploy.html), [Leaflet 마커·타일 API](https://leafletjs.com/reference.html), [Chart.js 막대 차트](https://www.chartjs.org/docs/latest/charts/bar.html), [Playwright 테스트 서버](https://playwright.dev/docs/test-webserver).

외부 게시·푸시·배포를 수행하지 않았습니다. 라이브 URL은 배포 전 자리표시이며 로컬 검증 결과는 `VERIFICATION.md`에 기록합니다.
