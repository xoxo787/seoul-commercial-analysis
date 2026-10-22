# 🚇 서울시 지하철 유동인구 × 상권 매출 분석

> **SCQA 기반 데이터 분석을 통한 창업 입지 추천 프로젝트**
>
> 유동인구가 많은 역이 반드시 매출이 높은 상권인지 통계적으로 검증합니다.

---

## 📌 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **주제** | 지하철역 유동인구와 상권 매출의 상관관계 분석 |
| **목표** | "유동인구가 많은 역 = 좋은 상권"이라는 통념을 데이터로 검증 |
| **방법론** | SCQA 프레임워크 + 피라미드 근거 구조 (Minto 원칙) |
| **기간** | 2025년 |
| **소속** | 이어드림스쿨 6기 |

---

## 🔑 핵심 발견

| 발견 | 결과 | 의미 |
|------|------|------|
| **회귀분석** | R² = 0.164 | 유동인구는 매출의 **16.4%** 만 설명 |
| **Spearman 상관** | ρ = 0.574 | 순위 일치도 **불완전** |
| **t-test** | p < 0.001 | 매출 그룹 간 유동인구 차이 **유의** |
| **알짜 vs 거품** | 격차 최대 221단계 | **가락시장·고덕** 추천, **혜화·명동** 주의 |

### 💡 결론
> **유동인구가 많은 역이 반드시 살아있는 상권은 아닙니다.**
> 진짜 살아있는 상권은 사람이 지나가는 곳이 아니라, 소비가 발생하는 곳입니다.

---

## 📊 사용 데이터

| 데이터 | 출처 | 설명 |
|--------|------|------|
| 🚇 지하철 승하차 | [서울열린데이터광장](https://data.seoul.go.kr) (OA-12914) | 528개 역, 2026년 5월 일별 |
| 🏪 상권 매출 | [서울열린데이터광장](https://data.seoul.go.kr) (OA-15572) | 1,577개 상권, 62개 업종 |
| 📌 역 좌표 | GitHub Gist + 공공데이터 | 255개 역 위도/경도 |

---

## 📁 파일 구조

```
📦 seoul-commercial-analysis/
├── 📄 README.md                 # 프로젝트 설명 (지금 이 파일)
├── 📄 requirements.txt          # 필요 패키지 목록
├── 📄 .gitignore                # Git 제외 파일 설정
│
├── 📁 code/
│   ├── 📄 analysis_complete.py  # 전체 분석 파이프라인 (Python)
│   ├── 📄 analysis_notebook.ipynb  # Jupyter Notebook 버전
│   └── 📄 visualization.py      # 시각화 전용 코드
│
├── 📁 data/
│   └── 📄 data_guide.md         # 데이터 출처 및 다운로드 안내
│
├── 📁 output/
│   ├── 📊 scatter_clean.png     # 최종 산점도 (300dpi)
│   ├── 📊 presentation.pptx     # 발표용 PPT 19장
│   └── 📊 scatter_regression.png # 회귀분석 산점도
│
└── 📁 docs/
    ├── 📄 SCQA_프레임워크.md     # SCQA 분석 구조
    └── 📄 발표대본.md            # 슬라이드별 발표 스크립트
```

---

## 🚀 실행 방법

```bash
# 1. 패키지 설치
pip install -r requirements.txt

# 2. 데이터 준비
# data/ 폴더에 다음 파일 배치:
# - CARD_SUBWAY_MONTH_202605.csv (지하철 데이터)
# - 서울시_상권분석서비스_2025.zip (상권 데이터)

# 3. 전체 분석 실행
python code/analysis_complete.py

# 4. 결과물 확인
# output/ 폴더에 차트 생성됨
```

---

## 🛠 사용 기술

| 기술 | 용도 |
|------|------|
| **Python 3.11** | 분석 언어 |
| **pandas / numpy** | 데이터 전처리 |
| **scipy.stats** | 통계분석 (ttest, ANOVA, 회귀) |
| **matplotlib** | 시각화 |
| **adjustText** | 그래프 라벨 자동 배치 |
| **python-pptx** | PPT 자동 생성 |

---

## 📝 라이선스

MIT License — 자유롭게 사용, 수정, 공유 가능합니다.

---

## 👤 만든 사람

**이어드림스쿨 6기** — 데이터 분석 프로젝트

데이터 출처: [서울열린데이터광장](https://data.seoul.go.kr), [공공데이터포털](https://www.data.go.kr)

## 웹 서비스

**2026-10-22 GitHub Pages 배포를 완료했습니다.** [서울 지하철 × 상권 웹 서비스](https://xoxo787.github.io/seoul-commercial-analysis/)에서 이용할 수 있으며, 공개 URL 응답 `200`을 확인했습니다.

역을 검색하거나 지도에서 선택해 승하차·매출 순위, 순위 격차 판정과 업종별 매출을 확인하는 Vite + TypeScript 정적 웹입니다. 지도는 Leaflet와 OpenStreetMap, 차트는 Chart.js를 사용합니다. 웹은 커밋된 JSON을 읽으며, 원본 데이터 재계산은 Python에서 수행합니다.

### 구조와 CI/CD 흐름

```text
공개 원본 데이터 (서울열린데이터광장)
  → scripts/download_data.py → data/raw/ (Git 제외)
  → scripts/build_data.py (역 매칭·순위·통계·출처 메타데이터)
  → web/public/data/*.json (stations.json, summary.json을 커밋)
  → Vite 빌드 + version.json 생성 → web/dist/
  → GitHub Pages (GitHub Actions로 2026-10-22 배포 완료)

push / pull_request → ci.yml
  ├─ Python 3.12: pip install -r requirements-dev.txt → pytest -q
  └─ Node.js 22: npm ci → npm test → npm run build
      └─ Playwright 별도 job: Chromium 설치 → npm run build → npm run test:e2e

main push / main에서 workflow_dispatch → deploy.yml
  → npm ci → npm test → npm run build
  → configure-pages → upload-pages-artifact (web/dist)
  → deploy-pages → 공개 version.json 요청·재시도 → commit == GITHUB_SHA 확인
```

두 워크플로의 최상위 권한은 `contents: read`이며, `pages: write`와 `id-token: write`는 배포 job에만 부여합니다. 공식 액션은 실제 조회한 전체 커밋 SHA로 고정했고, 각 `uses` 옆에 릴리스 태그를 기록했습니다. CI와 배포 빌드에서는 원본 데이터를 다운로드하거나 재계산하지 않습니다.

저장소의 Pages 게시 소스는 **GitHub Actions**로 설정되어 있습니다. 사용자 승인 후 2026-10-22 [PR #1](https://github.com/xoxo787/seoul-commercial-analysis/pull/1)을 `main`에 병합했으며, [배포 워크플로 실행](https://github.com/xoxo787/seoul-commercial-analysis/actions/runs/39751966336)이 성공했습니다. `configure-pages`의 자동 활성화는 꺼져 있습니다. 수동 실행은 `main`에서만 빌드·배포되고 동시 배포는 `pages` 그룹으로 제어합니다. [GitHub Pages 공식 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

배포 확인 기록 (2026-10-22):

- 배포 커밋: `b42e8f200e5d9920f7b1a9755d91eece1d88b20f`. 배포 워크플로의 **배포된 version.json의 커밋 검증** 단계가 통과했습니다.
- 공개 [version.json](https://xoxo787.github.io/seoul-commercial-analysis/version.json) 응답: `{"commit":"b42e8f200e5d9920f7b1a9755d91eece1d88b20f","built_at":"2026-10-22T08:59:56.343Z"}`. `built_at`은 UTC 빌드 시각입니다.
- 공개 [data/summary.json](https://xoxo787.github.io/seoul-commercial-analysis/data/summary.json) 응답 `200`: 분석 대상 **239개 역**, R² **0.1642**, Spearman ρ **0.5755** (소수 넷째 자리 반올림).
- PR CI의 Python 데이터 검증, 웹 테스트 및 빌드, 브라우저 스모크 테스트가 모두 통과했습니다. 첫 실행의 Linux Chromium 소켓 경로 길이 초과 문제는 커밋 `76ad73f`에서 수정한 뒤 통과했습니다.
- 라이브 브라우저에서 데스크톱 1440px 라이트와 375px 다크 화면을 확인했습니다. 콘솔 에러 0건, 가로 넘침 없음, OpenStreetMap 타일 로드와 “혜화” 검색 시 거품 판정 상세 표시를 확인했습니다.

### 로컬 실행과 테스트

웹 서비스용 기준 환경은 **Python 3.12, Node.js 22 LTS(22.12 이상), npm**입니다. 기존 분석 스크립트의 `requirements.txt`와 별도로, 새 파이프라인·테스트 의존성은 루트 `requirements-dev.txt`를 사용합니다. 웹 의존성은 `web/package-lock.json`으로 고정합니다.

저장소 루트에서 Python 검사를 실행합니다. 원본 다운로드 없이 커밋된 JSON과 테스트 데이터를 검사합니다.

```bash
pip install -r requirements-dev.txt
pytest -q
```

웹 설치·단위 테스트·빌드·미리보기:

```bash
cd web
npm ci
npm test
npm run build
npm run preview -- --port 4173
```

미리보기 주소는 `http://127.0.0.1:4173/seoul-commercial-analysis/`입니다. 개발 모드는 `web/`에서 `npm run dev`로 실행합니다. Vite의 `base`는 GitHub Pages 프로젝트 경로인 `/seoul-commercial-analysis/`로 고정되어 있습니다.

브라우저 스모크 테스트는 `web/`에서 실행합니다. 첫 명령은 무료 Chromium을 내려받으며, 테스트는 별도의 로컬 서버를 실행합니다.

```bash
npm run install:browsers
npm run build
npm run test:e2e
```

빌드 후 `web/dist/version.json`에 `commit`과 UTC `built_at`이 생성됩니다. 커밋은 `GITHUB_SHA`, 로컬 `git rev-parse HEAD`, `unknown` 순으로 결정됩니다. 배포 헬스체크는 공개 URL의 `version.json`을 재시도해 현재 워크플로 커밋과 대조합니다. 로컬 빌드 성공만으로 공개 배포 성공을 의미하지는 않습니다.

### 데이터 출처와 실제 기준

아래 정보와 통계는 커밋된 [summary.json](web/public/data/summary.json) 및 [stations.json](web/public/data/stations.json)을 기준으로 합니다. 앞부분의 기존 분석 기록은 보존하며, 웹 서비스의 현재 데이터는 이 절에서 구분해 설명합니다.

| 데이터 출처 | JSON 데이터셋 ID | 실제 사용 기간·조회 정보 |
|---|---|---|
| [서울특별시·코레일·공항철도 지하철호선별 역별 승하차 인원 정보](https://data.seoul.go.kr/dataList/OA-12914/S/1/datasetView.do) | `OA-12914` | 202605 |
| [서울특별시·서울신용보증재단 상권분석서비스(추정매출-상권)](https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do) | `OA-15572` | 2025년 1~4분기 합계 (20251, 20252, 20253, 20254) |
| [서울특별시 역사마스터 정보 (OA-21232)](https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do) | `station-coords` | 2026-10-22T08:18:23.196953Z 조회; 개별 좌표 기준일 미상 |

- 승하차 요청 월: `202605`, 실제 사용 월: `202605`. **기준월 대체 없음** (`subway_substituted: false`, `substitution_note: null`).
- 매출 집계 기간: **2025년 1~4분기 합계 (20251, 20252, 20253, 20254)**. 단위는 억원이며 한 달 매출이 아닙니다.
- 분석 대상: 역명·상권명 매칭에 성공하고 대표 상권 매출이 양수인 **239개 역**. 업종 목록은 **62개**입니다.
- JSON 생성 시각: `2026-10-22T08:18:36.776203Z`; 생성기: `scripts/build_data.py`.
- 위 원본의 이용허락은 JSON 메타데이터에 **공공누리 제1유형: 출처표시(상업적 이용 및 변경 가능)**로 기록되어 있습니다. 코드 라이선스와 데이터 이용허락은 구분하며, 재사용 시 서울특별시·서울신용보증재단 등 해당 출처를 표시하고 원문 이용 조건을 확인합니다.

원본부터 다시 계산하려면 저장소 루트에서 다음 명령을 실행합니다. 다운로드 도구는 공개 파일을 `data/raw/`에 보관하고 원본 해시·URL을 `download_manifest.json`에 기록합니다. 기존 원본을 보존하므로 새 스냅샷을 받으려면 두 명령에 동일한 새로운 `--raw-dir`을 지정합니다.

```bash
python scripts/download_data.py
python scripts/build_data.py
```

재생성 후 `summary.json`의 기준월·대체 여부·생성 시각·통계가 바뀌면 이 절도 함께 갱신해야 합니다. CI는 이 재생성 명령을 실행하지 않습니다.

### 재계산 통계와 기존 값 비교

| 지표 | 기존 README 기록 | 커밋된 JSON의 재계산 값 |
|---|---:|---:|
| 회귀 결정계수 R² | 0.164 | 0.1641505764582242 |
| Spearman 순위상관 ρ | 0.574 | 0.575462360676488 |

R²는 소수 셋째 자리로 반올림하면 기존 값과 같고, ρ는 `0.575`로 기존 `0.574`와 다릅니다. `readme_reference.note`에 기록된 이번 원본은 2026년 5월 승하차 19,131행·528개 역, 2025년 1~4분기 매출 85,732행·1,577개 상권입니다. 기존 실행 원본 해시와 실행 결과가 저장되지 않아 **ρ 차이의 원인은 확정할 수 없습니다**. 현재 입력 범위와 집계 방식을 기록했으며 기존 값에 맞추어 수치를 조정하지 않았습니다.

### 집계 방식과 해석의 한계

- 일평균 승하차는 기존 코드와 동일하게 **역별 승하차 합계 ÷ 원본 행 수(역·노선·일)**로 계산합니다. 환승역 전체 노선을 합친 하루 이용객 수와 다를 수 있습니다.
- 역명에서 괄호 부역명을 제거하고 상권명 시작의 역명과 매칭합니다. 여러 후보 중 **기간 매출이 가장 큰 한 상권**을 대표로 선택하며, 해당 역 주변 모든 상권의 매출 합계나 반경 분석이 아닙니다. 업종 매출도 대표 상권의 값입니다.
- `gap = sales_rank - pass_rank`이며 순위 1은 가장 큰 값입니다. 분석 대상 239개 역의 판정 임계값은 `ceil(0.1 × 239) = 24`입니다. `gap ≤ -24`는 알짜, `gap ≥ 24`는 거품, 그 사이는 보통으로 표시합니다.
- 승하차와 매출의 기준 연도가 다르고 매출은 추정값입니다. 알짜·거품 판정은 순위 격차를 요약한 탐색 지표이며, 수익성이나 유동인구의 인과효과를 뜻하지 않습니다.
- 역 좌표는 공식 역사마스터에서 확인한 값이며 개별 좌표 기준일은 미상입니다. 여러 노선이 있는 역은 원본의 한 노선과 실제 좌표 하나로 표시하고, 좌표를 확인할 수 없으면 `null`로 유지합니다. 지도 배경은 OpenStreetMap 외부 타일을 사용하므로 네트워크 상태의 영향을 받습니다.

포트폴리오에 사용할 문구와 AI 도구 도움·사용자 결정 기록 칸은 [사용자 확인 전 초안](docs/PORTFOLIO_LINE.md)에 정리했습니다.
