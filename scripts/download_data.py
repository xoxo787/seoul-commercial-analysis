#!/usr/bin/env python3
"""서울열린데이터광장 공개 파일만 내려받는다. 로그인·API 키를 사용하지 않는다.

이미 있는 원본은 덮어쓰지 않는다. 원본을 갱신하려면 새로운 --raw-dir을 사용한다.
다운로드 후 python scripts/build_data.py --raw-dir <동일 폴더>로 생성한다.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUESTED_MONTH = "202605"
FILE_ENDPOINT = "https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do"
COORDINATE_URL = "https://datafile.seoul.go.kr/bigfile/iot/sheet/csv/download.do?" + urllib.parse.urlencode({
    "srvType": "S", "infId": "OA-21232", "serviceKind": "0", "pageNo": "1",
    "ssUserId": "SAMPLE_VIEW", "strWhere": "", "strOrderby": "BLDN_ID DESC",
})


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "seoul-commercial-analysis/public-data"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def listed_files(page: str) -> list[tuple[str, str]]:
    return [(html.unescape(name), sequence) for name, sequence in re.findall(
        r'<span\s+title="([^"]+)"\s+onclick="javascript:downloadFile\(\'(\d+)\'\);"', page
    )]


def nearest_month(files: list[tuple[str, str]], requested: str) -> tuple[str, str]:
    """달 간 거리를 비교하며, 같은 거리라면 과거 월을 우선한다."""
    datetime.strptime(requested, "%Y%m")
    candidates = [(name, seq) for name, seq in files if re.fullmatch(r"CARD_SUBWAY_MONTH_\d{6}\.csv", name)]
    if not candidates:
        raise ValueError("공개 월별 승하차 CSV를 찾지 못했습니다")
    def month_number(value: str) -> int:
        parsed = datetime.strptime(value, "%Y%m")
        return parsed.year * 12 + parsed.month
    target = month_number(requested)
    return min(candidates, key=lambda pair: (abs(month_number(pair[0][18:24]) - target), pair[0]))


def file_url(dataset_id: str, sequence: str) -> str:
    return FILE_ENDPOINT + "?" + urllib.parse.urlencode({
        "infId": dataset_id, "infSeq": "3", "seq": sequence, "seqNo": "", "useCache": "false",
    })


def preserve_download(path: Path, url: str, kind: str) -> dict:
    downloaded = not path.exists()
    payload = fetch(url) if downloaded else path.read_bytes()
    if kind == "zip" and not payload.startswith(b"PK"):
        raise ValueError(f"ZIP이 아닌 다운로드 응답: {path.name}")
    if kind == "csv" and (len(payload) < 100 or b"<html" in payload[:1000].lower()):
        raise ValueError(f"CSV가 아닌 다운로드 응답: {path.name}")
    if downloaded:
        with path.open("xb") as stream:
            stream.write(payload)
    return {"filename": path.name, "download_url": url, "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(), "downloaded_now": downloaded}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw")
    args = parser.parse_args()
    args.raw_dir.mkdir(parents=True, exist_ok=True)
    pages = {}
    for dataset_id in ("OA-12914", "OA-15572", "OA-21232"):
        url = f"https://data.seoul.go.kr/dataList/{dataset_id}/S/1/datasetView.do"
        page = fetch(url).decode("utf-8")
        if "공공누리 1유형" not in page:
            raise ValueError(f"{dataset_id}: 이용허락 변경 또는 페이지 오류, 직접 확인 필요")
        pages[dataset_id] = page
    subway_name, subway_seq = nearest_month(listed_files(pages["OA-12914"]), REQUESTED_MONTH)
    commercial = [(name, seq) for name, seq in listed_files(pages["OA-15572"]) if name.endswith("_2025년.zip")]
    if len(commercial) != 1:
        raise ValueError("2025년 매출 ZIP을 유일하게 확인하지 못했습니다")
    commercial_name, commercial_seq = commercial[0]
    retrieved_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    entries = []
    for dataset_id, original_name, name, url, kind in (
        ("OA-12914", subway_name, subway_name, file_url("OA-12914", subway_seq), "csv"),
        ("OA-15572", commercial_name, "commercial_2025.zip", file_url("OA-15572", commercial_seq), "zip"),
        ("OA-21232", "서울시 역사마스터 정보.csv", "station_coords.csv", COORDINATE_URL, "csv"),
    ):
        entry = preserve_download(args.raw_dir / name, url, kind)
        entries.append({**entry, "dataset_id": dataset_id, "original_filename": original_name,
                        "source_url": f"https://data.seoul.go.kr/dataList/{dataset_id}/S/1/datasetView.do",
                        "license": "공공누리 제1유형: 출처표시 (상업적 이용 및 변경 가능)",
                        "license_checked_at": retrieved_at})
        print(f"{dataset_id}: {name} ({entry['bytes']:,} bytes), sha256={entry['sha256']}")
    manifest = {"retrieved_at": retrieved_at, "subway_month_requested": REQUESTED_MONTH,
                "subway_file": subway_name, "subway_substituted": subway_name[18:24] != REQUESTED_MONTH,
                "coordinates_retrieved_at": retrieved_at, "files": entries}
    manifest_path = args.raw_dir / "download_manifest.json"
    if manifest_path.exists():
        print("기존 download_manifest.json을 보존했습니다. 갱신하려면 새로운 --raw-dir을 지정하세요.")
    else:
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
