# 데이터 파이프라인 검증 보고서 — 작업자 A

검증일: 2026-10-22, 브랜치 `feat/web-service`.
공개 원본의 실제 값으로 239개 역 JSON을 생성했으며, Python 3.12.12와 3.14.6에서 검증했다.
데이터·생성기 커밋: `23ab226`; 테스트 커밋: `788e98d`.

## 합격 기준과 관측 결과

| 항목 | expected | observed | passed |
|---|---|---|---|
| 1. Python 테스트 | `pytest -q` 전체 통과 | Python 3.14.6: `49 passed in 1.13s`; Python 3.12.12: `49 passed in 15.55s` | true |
| 2. 실제 샘플 | 역 3개의 이름·양쪽 순위·격차·판정·상위 업종 확인 | 아래 강남·고덕·혜화 표; 239개 역 전체 스키마·순위·업종 합계 검증 | true |
| 3. 기존 통계와 비교 | 재계산 수치와 차이를 실제 근거로 설명 | R²는 소수 셋째 자리 일치; ρ는 다름; 기존 코드 독립 재실행도 새 JSON과 동일하며 과거 문서값 발생 원인은 미보관으로 확정 불가 | true (비교·현재 코드 재현 검증) |
| 4. 원본과 기간 | 다운로드 파일·URL·월·분기·대체 여부 기록 | 202605 CSV, 2025년 1~4분기 ZIP, 공식 역사마스터; 월 대체 없음; 새 폴더 재다운로드 SHA-256 3/3 일치 | true |
| 5. 이용허락 | 공식 데이터셋 이용조건 확인·출처 표기 | OA-12914, OA-15572, OA-21232 모두 공공누리 1유형; JSON의 sources와 아래 출처에 표기 | true |
| 6. Git·원본 보존 | 담당 코드·JSON 커밋, raw 미추적 | 코드·테스트 커밋 후 담당 경로 `git status --porcelain` 출력 없음; `git ls-files -- data/raw` 출력 없음; `git status --porcelain --ignored -- data/raw`는 `!! data/raw/` | true |

이 보고서도 별도 커밋하며, 최종 `worker_done` 직전에 담당 경로의 깨끗한 상태를 재확인한다.
다른 작업자의 파일·stage·커밋은 건드리지 않았다. 웹·CI·배포 검증은 B/C 및 코디네이터 담당이다.

## 실제 JSON 샘플

| 역 | 유동인구 순위 | 매출 순위 | gap = 매출 - 유동인구 순위 | 판정 | 상위 업종 | 그 업종 매출(억원) |
|---|---:|---:|---:|---|---|---:|
| 강남 | 1 | 2 | 1 | 보통 | 일반의원 | 5205.25742443 |
| 고덕 | 158 | 31 | -127 | 알짜 | 일반교습학원 | 1083.89077136 |
| 혜화 | 11 | 232 | 221 | 거품 | 한식음식점 | 5.67742015 |

분석 대상 239역, 임계값 `ceil(239 × 0.1) = 24`이며 알짜 84역·거품 75역·보통 80역이다.
좌표는 239역 모두 원본의 실제 좌표에 연결되었으며 평균이나 임의 좌표를 생성하지 않았다.

## 통계와 기존 README 차이

| 지표 | 재계산 | README | 확인 결과 |
|---|---:|---:|---|
| R² | 0.1641505764582242 | 0.164 | 소수 셋째 자리 반올림 시 일치 |
| Spearman ρ | 0.575462360676488 | 0.574 | 차이 +0.001462360676488; 소수 셋째 자리도 불일치 |
| 회귀 기울기 | 591.8307047926139 | 비교값 없음 | x는 일평균 승하차 만 명, y는 억원 |
| 회귀 절편 | -280.97798070075305 | 비교값 없음 | 분석 대상 전체로 계산 |
| 회귀 p | 7.410564296771793e-11 | 비교값 없음 | 유한한 JSON number |
| Spearman p | 1.784087348832644e-22 | 비교값 없음 | 유한한 JSON number |

확인된 범위는 승하차 **19,131행·528역**, 상권 매출 **85,732행·1,577상권·62업종**, 정규식 매칭과 양수 매출 필터를 통과한 **239역**이다. README의 528역·1,577상권과 기존 코드의 239역 표기 및 입력 파일 기간에 부합한다.

`code/analysis_complete.py`를 수정하지 않고 `subway_path =`부터 `# 5-3.` 직전까지의 계산 구간을 읽어, 메모리에서 입력 경로 두 곳만 `data/raw`로 바꾸어 별도 실행했다. 실행에 필요한 csv/json/re/os/zipfile/io/numpy/scipy만 제공하여 matplotlib·adjustText·그림 저장을 실행하지 않았다. 이 구간은 기존의 반복 합산·매칭·정렬 코드를 그대로 실행한다. 모든 239역의 daily_passengers/sales_eok/pass_rank/sales_rank/gap/flow_type/line를 새 JSON과 대조했다.

```text
INDEPENDENT_LEGACY_PARITY: all 239 stations; R2= 0.16415057645822406 rho= 0.575462360676488
```

따라서 현재 지정 원본에서의 ρ 차이는 새 파이프라인 리팩터링으로 발생한 것이 아니다. 현재 자료에는 승객·매출 값의 동률도 없으며 원값으로 구한 Spearman 역시 0.575462360676488이다. **기존 README의 0.574를 낸 과거 원본 해시·실행 결과가 없어 그 문서값이 생긴 이유는 확정할 수 없다.** 월·분기·매칭 수가 달랐다고 추측하거나 수치를 조정하지 않았다. `summary.readme_reference.note`에도 현재 범위와 확인 한계를 명시했다.

## 원본 다운로드와 이용허락

2026-10-22 공개 페이지에서 이용허락을 확인했다. 아래 3개 데이터셋 모두 **공공누리 제1유형: 출처표시, 상업적 이용 및 변경 가능**으로 표시되어 있다. 프로젝트 코드의 MIT 표기와 별개로 원자료 제공기관·데이터셋명·원본 URL·기간·이용허락을 JSON의 `meta.sources`에 보존한다.

1. **승하차:** `data/raw/CARD_SUBWAY_MONTH_202605.csv` (UTF-8 BOM, 1,235,036 bytes).
   - [공식 설명·이용허락 OA-12914](https://data.seoul.go.kr/dataList/OA-12914/S/1/datasetView.do)
   - [공개 다운로드](https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?infId=OA-12914&infSeq=3&seq=154&seqNo=&useCache=false)
   - 2026-05-01~2026-05-31, 31개 날짜; 요청월 202605 그대로 사용, `subway_substituted=false`, `substitution_note=null`.
   - 날짜·노선·역 조합 중복 0건.
   - SHA-256: `edcc0c504d0ec9a91e24865cd640f901629043670425ce15bce8ee1487330315`.

2. **매출:** 원본 이름 `서울시 상권분석서비스(추정매출-상권)_2025년.zip`, 로컬 보존명 `data/raw/commercial_2025.zip` (14,035,292 bytes).
   - [공식 설명·이용허락 OA-15572](https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do)
   - [공개 다운로드](https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?infId=OA-15572&infSeq=3&seq=51&seqNo=&useCache=false)
   - ZIP의 단일 CSV는 CP949, 39,698,674 bytes이며 기존 코드와 같이 전체 분기·전체 상권·전체 업종을 읽었다.
   - 분기별 행 수: `20251=21427`, `20252=21452`, `20253=21520`, `20254=21333`; 분기·상권코드·업종코드 조합 중복 0건.
   - SHA-256: `c907f3d386d62b89f45781e6e6172328ee91b1b8dd2c621e4171e437bee1c6b2`.

3. **좌표:** `data/raw/station_coords.csv` (CP949, 40,334 bytes, 784행·655개 원본 역사명).
   - [공식 설명·이용허락 OA-21232](https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do)
   - [공개 Sheet CSV 다운로드](https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do?srvType=S&infId=OA-21232&serviceKind=0&pageNo=1&ssUserId=SAMPLE_VIEW&strWhere=&strOrderby=BLDN_ID+DESC)
   - 코드·노트북에 Gist URL이 없어 공식 역사마스터로 대체했다. 위 `SAMPLE_VIEW`는 공개 페이지가 제공하는 익명 다운로드 값이며 사용자 인증정보가 아니다.
   - 조회 확인 시각 `2026-10-22T08:18:23.196953Z`; 개별 좌표의 기준일은 원자료에 없어 미상으로 표시했다. 지하철 분석월을 좌표 기준월로 가정하지 않았다.
   - SHA-256: `bd20809626417942cf8c76c81818fdec221336067ad3a38c30f04c914cbc3afb`.

초기 파일은 공개 URL로 직접 다운로드했고, 이어 downloader를 실행하여 기존 원본을 덮어쓰지 않고 `data/raw/download_manifest.json`에 출처·크기·해시를 기록했다. 별도 새 폴더에서 downloader의 실제 다운로드 경로도 검증했다.

## 재현 명령과 검증 범위

```text
pip install -r requirements-dev.txt
python scripts/download_data.py
python scripts/build_data.py
pytest -q
```

CI는 `pytest -q`에서 커밋된 JSON과 합성 입력만 검사한다. 원본 다운로드·API 키·로그인은 필요 없다. 생성 스크립트는 네트워크를 사용하지 않으며, 다운로드 스크립트는 공개 페이지의 파일 목록을 확인한다. 요청월이 목록에 없을 때만 월 간 거리가 가장 가까운 공개 월을 택하고 같은 거리에서는 과거 월을 택한다.

검증한 항목:

- 역명 괄호 제거·정규식의 정확한 매칭, 후보 상권 연간 매출 최대값, 대표 상권만의 업종 합계, 0매출 제외.
- 원본 행 수 분모, 유형 분류 0.495/0.505 경계, 연속 순위, gap 부호, ceil 기준과 포함 경계, 동률의 결정적 정렬.
- 작은 수기 예제의 기울기 0.6·절편 1·R² 0.36·ρ 0.6·p 0.4; 상수·부족한 입력·비유한 수의 명시적 실패.
- JSON Schema 필수 필드·형식·enum·타입·범위, NaN/Infinity 거부, 전 역 ID/역명 고유성·순위 연속성·정렬·판정·업종 합계·상위 목록·공통 메타데이터 일치.
- 생성 함수나 SciPy를 재사용하지 않는 중심화 합 공식의 회귀 검증과 순위 차이 공식의 ρ 검증.
- 새 다운로드 3개 원본 해시 일치; 조회·생성 시각을 제외한 JSON 전체 일치.
- Python 3.12/3.14 재생성 결과에서 `generated_at`만 제외하면 JSON 전체 동일.

격리 검증 파일은 삭제하지 않았다:

```text
data/raw/verification-7752f897ecaf417db3737c75e0ab63f5/venv/Scripts/python.exe
data/raw/download-check-80b975da6de347248d4f9203125699f0/
data/raw/python312-check-072b33a8e6f14b568ecd15bf8dba02ab/venv/Scripts/python.exe
```

Python 3.14 검증 환경은 기존 설치 패키지를 읽는 venv에 pytest를 추가했다. Python 3.12는 `data/raw` 내부에 새 런타임과 독립 venv를 만들고 고정 의존성을 설치했다. 시스템 Python 기본값·레지스트리·전역 실행파일은 변경하지 않았다.

## 해석 한계와 변경 범위

- 기존 분석을 보존하기 위해 승하차 합계를 역별 원본 행 수로 나눈다. 여러 노선이 같은 역명으로 집계되는 환승역에서 이는 모든 노선의 일합계와 다르다. 표시 노선은 원본 첫 행의 노선이다.
- 역명 문자열 매칭으로 대표 상권 한 곳을 선택한다. 역 주변 모든 점포의 반경 매출이나 총유동인구가 아니다.
- 매출은 2025년 1~4분기 합계이며 승하차는 2026년 5월이다. 이시점 비교·관찰 상관으로 수익성·인과성·창업 성공을 입증하지 않는다.
- 출발/도착 유형은 승차와 하차 비중의 분류다. 시간대별 출근/퇴근 행동을 직접 측정하지 않는다.
- 숫자가 같은 경우만 결정적 순서 규칙을 추가했다. 현재 실제 데이터에는 승객·매출 동률이 없고 기존 코드의 전체 순위와 일치한다.
- 기존 `code/`, 노트북, `docs/`, `output/`, `README.md`, 다른 웹 파일, `.github/`를 수정하지 않았다. 외부 push·게시·배포·메시지는 수행하지 않았으며, 진행·완료 보고는 승인된 Orca orchestration 채널만 사용한다.

담당 변경 파일:

```text
.gitignore
requirements-dev.txt
pytest.ini
scripts/build_data.py
scripts/download_data.py
scripts/DATA_PIPELINE_REPORT.md
tests/test_pipeline.py
tests/test_generated_json.py
web/public/data/stations.json
web/public/data/summary.json
```
