#!/usr/bin/env python3
"""공개 원본을 오프라인으로 집계하여 웹에서 사용할 UTF-8 JSON을 만든다.

기존 code/analysis_complete.py의 정의를 유지한다. 특히 승하차 합계의
분모는 날짜 수가 아닌 역별 원본 행 수이며, 매출은 대표 상권의 연간 합계다.
실행: python scripts/build_data.py (원본 준비: python scripts/download_data.py)
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import re
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from scipy.stats import linregress, spearmanr

ROOT = Path(__file__).resolve().parents[1]
REQUESTED_MONTH = "202605"
README_R2 = 0.164
README_RHO = 0.574
LICENSE = "공공누리 제1유형: 출처표시 (상업적 이용 및 변경 가능)"
DATASET_URLS = {
    "OA-12914": "https://data.seoul.go.kr/dataList/OA-12914/S/1/datasetView.do",
    "OA-15572": "https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do",
    "station-coords": "https://data.seoul.go.kr/dataList/OA-21232/S/1/datasetView.do",
}


def clean_station_name(name: str) -> str:
    """원본 매칭식 그대로 괄호 속 부역명을 제거한다."""
    return re.sub(r"\([^)]*\)", "", name).strip()


def station_id(name: str) -> str:
    """순위·입력 순서와 무관한 역명 기반 ID; 부역명이 다른 역도 구분한다."""
    normalized = unicodedata.normalize("NFC", name)
    slug = re.sub(r"[^\w]+", "-", normalized).strip("-").lower()
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:10]
    return f"station-{slug}-{digest}"


def nonnegative_integer(value: str, field: str) -> int:
    number = int(value)
    if number < 0:
        raise ValueError(f"{field}: 음수 값은 사용할 수 없습니다")
    return number


def aggregate_passengers(rows: list[dict]) -> dict[str, dict]:
    totals: dict[str, dict] = {}
    for row in rows:
        name = row["역명"].strip()
        if not name:
            raise ValueError("빈 역명")
        entry = totals.setdefault(name, {"board": 0, "alight": 0, "rows": 0, "line": row["노선명"]})
        entry["board"] += nonnegative_integer(row["승차총승객수"], "승차총승객수")
        entry["alight"] += nonnegative_integer(row["하차총승객수"], "하차총승객수")
        entry["rows"] += 1
    result = {}
    for name, entry in totals.items():
        total = entry["board"] + entry["alight"]
        if not total:
            raise ValueError(f"{name}: 승하차 합계 0으로 유형을 정할 수 없습니다")
        ratio = entry["alight"] / total
        result[name] = {
            "daily_passengers": total / entry["rows"],
            "line": entry["line"],
            "flow_type": "도착형" if ratio > 0.505 else "출발형" if ratio < 0.495 else "균형형",
        }
    return result


def aggregate_commercial(rows: list[dict]) -> dict[str, dict]:
    areas: dict[str, dict] = {}
    for row in rows:
        area = row["상권_코드_명"]
        industry = row["서비스_업종_코드_명"]
        if not area or not industry:
            raise ValueError("상권명과 업종명은 필수입니다")
        amount = nonnegative_integer(row["당월_매출_금액"], "당월_매출_금액")
        entry = areas.setdefault(area, {"sales_won": 0, "industries": defaultdict(int)})
        entry["sales_won"] += amount
        entry["industries"][industry] += amount
    return areas


def match_commercial_areas(station_names, area_names) -> dict[str, list[str]]:
    index: dict[str, list[str]] = defaultdict(list)
    for name in station_names:
        index[clean_station_name(name)].append(name)
    matches: dict[str, set[str]] = defaultdict(set)
    for area in area_names:
        match = re.match(r"^(.+?)역", area)
        if match:
            for name in index.get(match.group(1).strip(), []):
                matches[name].add(area)
    return {name: sorted(values) for name, values in matches.items()}


def classify_gap(gap: int, n_stations: int) -> str:
    if n_stations < 1:
        raise ValueError("분석 대상 역 수는 1 이상이어야 합니다")
    threshold = math.ceil(n_stations / 10)
    return "알짜" if gap <= -threshold else "거품" if gap >= threshold else "보통"


def rank_stations(stations: list[dict]) -> list[dict]:
    """순위는 1..n의 서열 순위; 승객 동률은 역명, 매출 동률은 승객순."""
    ranked = [dict(row) for row in sorted(stations, key=lambda row: (-row["daily_passengers"], row["name"]))]
    if len({row["name"] for row in ranked}) != len(ranked):
        raise ValueError("중복 역명")
    for rank, row in enumerate(ranked, 1):
        row["pass_rank"] = rank
    for rank, row in enumerate(sorted(ranked, key=lambda row: -row["sales_eok"]), 1):
        row["sales_rank"] = rank
        row["gap"] = rank - row["pass_rank"]
        row["verdict"] = classify_gap(row["gap"], len(ranked))
    return ranked


def calculate_statistics(stations: list[dict]) -> dict:
    if len(stations) < 3:
        raise ValueError("유의확률 계산에는 분석 대상 역이 3개 이상 필요합니다")
    x = [row["daily_passengers"] / 10_000 for row in stations]
    y = [row["sales_eok"] for row in stations]
    if not all(math.isfinite(value) for value in x + y):
        raise ValueError("통계 입력에 유한하지 않은 수가 있습니다")
    if len(set(x)) < 2 or len(set(y)) < 2:
        raise ValueError("상수 입력의 회귀·상관은 지원하지 않습니다")
    regression = linregress(x, y)
    correlation = spearmanr([row["pass_rank"] for row in stations], [row["sales_rank"] for row in stations])
    result = {
        "regression": {
            "r2": float(regression.rvalue ** 2),
            "slope": float(regression.slope),
            "intercept": float(regression.intercept),
            "p_value": float(regression.pvalue),
            "x_unit": "일평균 승하차(만 명)",
            "y_unit": "억원",
        },
        "spearman": {"rho": float(correlation.statistic), "p_value": float(correlation.pvalue)},
    }
    assert_finite(result)
    return result


def coordinates_for(name: str, line: str, coordinates: list[dict]) -> tuple[float | None, float | None]:
    candidates = [row for row in coordinates if clean_station_name(row["역사명"]) == clean_station_name(name)]
    # 승하차의 9호선2~3단계 표기는 좌표의 9호선과 동일 노선이다.
    normalized_line = re.sub(r"(\d+호선).*", r"\1", line)
    same_line = [row for row in candidates if row["호선"] == normalized_line]
    candidates = same_line or candidates
    points = []
    for row in sorted(candidates, key=lambda row: row["역사_ID"]):
        try:
            lat, lng = float(row["위도"]), float(row["경도"])
        except (ValueError, TypeError):
            continue
        if math.isfinite(lat) and math.isfinite(lng) and 33 <= lat <= 39 and 124 <= lng <= 132:
            points.append((lat, lng))
    # 동명 이역처럼 멀리 떨어진 후보는 추측하지 않는다. 평균 좌표도 만들지 않는다.
    if not points or max(p[0] for p in points) - min(p[0] for p in points) > 0.02 or max(p[1] for p in points) - min(p[1] for p in points) > 0.02:
        return None, None
    return points[0]


def analyze(subway_rows: list[dict], commercial_rows: list[dict], coordinates: list[dict]) -> list[dict]:
    passengers = aggregate_passengers(subway_rows)
    areas = aggregate_commercial(commercial_rows)
    matches = match_commercial_areas(passengers, areas)
    stations = []
    for name, candidates in matches.items():
        # 원본 set의 동률 선택을 안정화한다. 매출이 같으면 상권명 가나다순.
        best = min(candidates, key=lambda candidate: (-areas[candidate]["sales_won"], candidate))
        if areas[best]["sales_won"] <= 0:
            continue
        lat, lng = coordinates_for(name, passengers[name]["line"], coordinates)
        industries = sorted(areas[best]["industries"].items(), key=lambda item: (-item[1], item[0]))
        stations.append({
            "id": station_id(name), "name": name, **passengers[name], "lat": lat, "lng": lng,
            "sales_eok": areas[best]["sales_won"] / 100_000_000,
            "commercial_area": best, "commercial_areas_matched": candidates,
            "industries": [{"name": industry, "sales_eok": amount / 100_000_000, "rank": rank}
                           for rank, (industry, amount) in enumerate(industries, 1)],
        })
    ranked = rank_stations(stations)
    for row in ranked:
        row["explanation"] = (
            f"분석 대상 {len(ranked)}개 역 중 유동인구 {row['pass_rank']}위, "
            f"대표 상권 매출 {row['sales_rank']}위로 격차는 {row['gap']:+d}단계입니다. "
            f"판정 기준 ±{math.ceil(len(ranked) / 10)}단계에 따라 {row['verdict']}이며, "
            "이는 순위 비교로 수익성이나 투자 성과를 보장하지 않습니다."
        )
    return ranked


def assert_finite(value) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("JSON에는 NaN 또는 Infinity를 저장할 수 없습니다")
    if isinstance(value, dict):
        for item in value.values():
            assert_finite(item)
    elif isinstance(value, list):
        for item in value:
            assert_finite(item)


def read_csv(path: Path, encoding: str) -> list[dict]:
    with path.open(encoding=encoding, newline="") as stream:
        return list(csv.DictReader(stream))


def read_commercial_zip(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        members = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(members) != 1:
            raise ValueError("상권 ZIP에는 CSV가 정확히 하나 있어야 합니다. 원본 범위를 확인하세요")
        with archive.open(members[0]) as stream:
            return list(csv.DictReader(io.TextIOWrapper(stream, encoding="cp949", newline="")))


def source_metadata(month: str, quarters: list[str], generated_at: str, manifest: dict) -> dict:
    commercial_period = "2025년 1~4분기 합계 (20251, 20252, 20253, 20254)"
    if quarters != ["20251", "20252", "20253", "20254"]:
        raise ValueError(f"2025년 전체 분기 자료가 아닙니다: {quarters}")
    substituted = month != REQUESTED_MONTH
    coord_period = manifest.get("coordinates_retrieved_at", "기준일 미상; 공개 역사마스터 스냅샷")
    sources = [
        {"name": "서울특별시·코레일·공항철도 지하철호선별 역별 승하차 인원 정보", "dataset_id": "OA-12914", "url": DATASET_URLS["OA-12914"], "period": month, "license": LICENSE},
        {"name": "서울특별시·서울신용보증재단 상권분석서비스(추정매출-상권)", "dataset_id": "OA-15572", "url": DATASET_URLS["OA-15572"], "period": commercial_period, "license": LICENSE},
        {"name": "서울특별시 역사마스터 정보 (OA-21232)", "dataset_id": "station-coords", "url": DATASET_URLS["station-coords"], "period": f"{coord_period} 조회; 개별 좌표 기준일 미상", "license": LICENSE},
    ]
    return {
        "sources": sources, "subway_month": month, "subway_month_requested": REQUESTED_MONTH,
        "subway_substituted": substituted,
        "substitution_note": f"요청 월 {REQUESTED_MONTH} 공개 파일이 없어 가장 가까운 공개 월 {month}로 대체" if substituted else None,
        "commercial_period": commercial_period, "generated_at": generated_at, "generator": "scripts/build_data.py",
        "methodology": [
            "기존 분석과 동일하게 역별 승하차 합계를 원본 행 수(역·노선·일)로 나눕니다. 환승역의 모든 노선 일합계와 다릅니다.",
            "역명에서 괄호 부역명을 제거하고 상권명 시작의 역명과 일치시킵니다. 주변 반경 전체 상권을 의미하지 않습니다.",
            "후보 상권 중 2025년 1~4분기 매출 합계가 가장 큰 한 곳만 대표로 선택합니다. 업종도 그 상권만 집계합니다.",
            "2026년 승하차와 2025년 매출을 비교한 관찰 분석입니다. 순위 격차는 수익성·인과관계를 나타내지 않습니다.",
            "역명별 첫 원본 행의 노선을 표시하며, 좌표는 공식 역사마스터의 일치 후보 중 실제 한 좌표를 사용합니다. 불명확하면 null입니다.",
        ],
    }


def build_documents(subway_rows: list[dict], commercial_rows: list[dict], coordinates: list[dict], generated_at: str, manifest: dict | None = None) -> tuple[dict, dict]:
    dates = {row["사용일자"] for row in subway_rows}
    if not dates or any(not re.fullmatch(r"\d{8}", day) for day in dates):
        raise ValueError("사용일자가 없거나 YYYYMMDD 형식이 아닙니다")
    for day in dates:
        datetime.strptime(day, "%Y%m%d")
    months = {day[:6] for day in dates}
    if len(months) != 1:
        raise ValueError("승하차 입력에는 한 달만 있어야 합니다")
    month = next(iter(months))
    quarters = sorted({row["기준_년분기_코드"] for row in commercial_rows})
    meta = source_metadata(month, quarters, generated_at, manifest or {})
    stations = analyze(subway_rows, commercial_rows, coordinates)
    stats = calculate_statistics(stations)
    matches_reference = round(stats["regression"]["r2"], 3) == README_R2 and round(stats["spearman"]["rho"], 3) == README_RHO
    note = "일치" if matches_reference else (
        f"재계산: R²={stats['regression']['r2']:.6f}, ρ={stats['spearman']['rho']:.6f}; "
        f"README: R²={README_R2}, ρ={README_RHO}. "
        f"공개 원본은 {month} 승하차 {len(subway_rows):,}행·{len(aggregate_passengers(subway_rows))}개 역, "
        f"2025년 1~4분기 매출 {len(commercial_rows):,}행·{len(aggregate_commercial(commercial_rows))}개 상권이며 "
        f"동일 정규식으로 매칭한 양수 매출 역은 {len(stations)}개입니다. "
        "기존 README의 528개 역·1,577개 상권 및 코드의 n=239 표기와 비교할 수 있습니다. "
        "기존 실행 원본 해시와 실행 결과가 저장되지 않아 차이 원인을 확정할 수 없습니다. "
        "이번 원본 범위와 집계식은 기록했으며 기존 값에 맞추어 조정하지 않았습니다."
    )
    def brief(row: dict) -> dict:
        return {key: row[key] for key in ("id", "name", "pass_rank", "sales_rank", "gap")}
    summary = {
        "meta": meta, "n_stations": len(stations), **stats,
        "readme_reference": {"r2": README_R2, "rho": README_RHO, "note": note},
        "verdict_threshold": math.ceil(len(stations) / 10),
        "top_gems": [brief(row) for row in sorted(stations, key=lambda row: (row["gap"], row["pass_rank"]))[:10]],
        "top_bubbles": [brief(row) for row in sorted(stations, key=lambda row: (-row["gap"], row["pass_rank"]))[:10]],
        "industries": sorted({row["서비스_업종_코드_명"] for row in commercial_rows}),
    }
    documents = {"meta": meta, "stations": stations}, summary
    assert_finite(list(documents))
    return documents


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "web/public/data")
    args = parser.parse_args()
    manifest_path = args.raw_dir / "download_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    subway_name = manifest.get("subway_file", f"CARD_SUBWAY_MONTH_{REQUESTED_MONTH}.csv")
    subway_rows = read_csv(args.raw_dir / subway_name, "utf-8-sig")
    commercial_rows = read_commercial_zip(args.raw_dir / "commercial_2025.zip")
    coordinate_path = args.raw_dir / "station_coords.csv"
    coordinates = read_csv(coordinate_path, "cp949") if coordinate_path.exists() else []
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    stations, summary = build_documents(subway_rows, commercial_rows, coordinates, generated_at, manifest)
    # 두 파일을 먼저 직렬화하여 유효하지 않은 수 때문에 일부만 갱신하지 않는다.
    encoded = [json.dumps(doc, ensure_ascii=False, indent=2, allow_nan=False) + "\n" for doc in (stations, summary)]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, content in zip(("stations.json", "summary.json"), encoded):
        (args.output_dir / name).write_text(content, encoding="utf-8", newline="\n")
    print(json.dumps({"n_stations": summary["n_stations"], "r2": summary["regression"]["r2"], "rho": summary["spearman"]["rho"], "reference": summary["readme_reference"]["note"], "coordinates": sum(row["lat"] is not None for row in stations["stations"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
