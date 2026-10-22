"""작은 수기 계산 예제로 원본 집계 정의와 예외 경계를 검증한다."""

import copy
import math

import pytest

from scripts.build_data import (
    aggregate_passengers,
    analyze,
    assert_finite,
    build_documents,
    calculate_statistics,
    classify_gap,
    coordinates_for,
    match_commercial_areas,
    rank_stations,
    station_id,
)
from scripts.download_data import listed_files, nearest_month


def subway(name, board, alight, line="2호선", date="20260501"):
    return {"역명": name, "노선명": line, "승차총승객수": str(board),
            "하차총승객수": str(alight), "사용일자": date}


def commercial(area, won, industry="한식음식점", quarter="20251"):
    return {"상권_코드_명": area, "당월_매출_금액": str(won),
            "서비스_업종_코드_명": industry, "기준_년분기_코드": quarter}


def coordinate(name="가", line="2호선", lat="37.5", lng="127.0", station="1"):
    return {"역사명": name, "호선": line, "위도": lat, "경도": lng, "역사_ID": station}


def test_passengers_preserve_original_row_denominator_and_first_line():
    rows = [subway("가", 100, 200), subway("가", 300, 400, "3호선"),
            subway("가", 200, 0, date="20260502")]
    actual = aggregate_passengers(rows)["가"]
    # 합계 1,200 / 서로 다른 날짜 2가 아니라 원본 행 3 = 400.
    assert actual == {"daily_passengers": 400, "line": "2호선", "flow_type": "균형형"}


@pytest.mark.parametrize("alight, expected", [(506, "도착형"), (505, "균형형"), (495, "균형형"), (494, "출발형")])
def test_flow_boundary(alight, expected):
    assert aggregate_passengers([subway("가", 1000 - alight, alight)])["가"]["flow_type"] == expected


@pytest.mark.parametrize("board,alight", [(0, 0), (-1, 5)])
def test_invalid_passenger_totals_are_not_silently_coerced(board, alight):
    with pytest.raises(ValueError):
        aggregate_passengers([subway("가", board, alight)])


def test_regex_match_is_exact_after_parentheses_removal():
    actual = match_commercial_areas(
        ["신촌(지하)", "신", "역삼", "서울역", "없는역"],
        ["신촌역 1번", "신촌역", "서울역", "역삼역 주변", "주변 신촌역", "신촌로", "신촌역"],
    )
    assert actual == {"신촌(지하)": ["신촌역", "신촌역 1번"], "역삼": ["역삼역 주변"]}


def test_representative_area_and_industries_use_full_period_sum():
    rows = [commercial("가역 A", 600_000_000, "음식", "20251"),
            commercial("가역 A", 400_000_000, "음식", "20252"),
            commercial("가역 A", 200_000_000, "소매", "20254"),
            commercial("가역 B", 1_100_000_000),
            commercial("나역", 0), commercial("없는역", 2_000_000_000)]
    stations = analyze([subway("가", 20, 30), subway("나", 5, 5)], rows, [])
    assert len(stations) == 1
    result = stations[0]
    assert result["commercial_area"] == "가역 A"
    assert result["commercial_areas_matched"] == ["가역 A", "가역 B"]
    assert result["sales_eok"] == 12
    assert result["industries"] == [{"name": "음식", "sales_eok": 10, "rank": 1},
                                    {"name": "소매", "sales_eok": 2, "rank": 2}]
    assert result["lat"] is result["lng"] is None


def test_representative_area_tie_is_stable():
    rows = [commercial("가역 B", 100), commercial("가역 A", 100)]
    assert analyze([subway("가", 2, 3)], rows, [])[0]["commercial_area"] == "가역 A"


def test_rank_gap_sign_and_nonmutating_ties():
    rows = [{"name": "나", "daily_passengers": 20, "sales_eok": 50},
            {"name": "가", "daily_passengers": 20, "sales_eok": 100},
            {"name": "다", "daily_passengers": 10, "sales_eok": 100}]
    original = copy.deepcopy(rows)
    result = rank_stations(rows)
    assert rows == original
    assert [(r["name"], r["pass_rank"], r["sales_rank"], r["gap"], r["verdict"]) for r in result] == [
        ("가", 1, 1, 0, "보통"), ("나", 2, 3, 1, "거품"), ("다", 3, 2, -1, "알짜")]


@pytest.mark.parametrize("n,gap,expected", [(239, -24, "알짜"), (239, -23, "보통"),
    (239, 23, "보통"), (239, 24, "거품"), (11, -1, "보통"), (11, -2, "알짜"),
    (10, 1, "거품"), (1, 0, "보통")])
def test_verdict_ceil_and_inclusive_boundaries(n, gap, expected):
    assert classify_gap(gap, n) == expected


def test_statistics_against_hand_calculation():
    # x=[1,2,3,4]만 명, y=[2,1,4,3]억: Sxx=Syy=5, Sxy=3.
    rows = [{"daily_passengers": x * 10_000, "sales_eok": y, "pass_rank": pr, "sales_rank": sr}
            for x, y, pr, sr in [(1, 2, 4, 3), (2, 1, 3, 4), (3, 4, 2, 1), (4, 3, 1, 2)]]
    stats = calculate_statistics(rows)
    assert stats["regression"]["slope"] == pytest.approx(0.6)
    assert stats["regression"]["intercept"] == pytest.approx(1)
    assert stats["regression"]["r2"] == pytest.approx(0.36)
    assert stats["regression"]["p_value"] == pytest.approx(0.4)
    assert stats["spearman"]["rho"] == pytest.approx(0.6)
    assert stats["spearman"]["p_value"] == pytest.approx(0.4)
    assert stats["regression"]["x_unit"] == "일평균 승하차(만 명)"


@pytest.mark.parametrize("daily,sales", [([1, 1, 1], [1, 2, 3]), ([1, 2, 3], [1, 1, 1]), ([1, math.nan, 3], [1, 2, 3])])
def test_undefined_statistics_fail_explicitly(daily, sales):
    rows = [{"daily_passengers": x, "sales_eok": y} for x, y in zip(daily, sales)]
    with pytest.raises(ValueError):
        calculate_statistics(rows)


def test_statistics_requires_enough_stations():
    with pytest.raises(ValueError):
        calculate_statistics([])


@pytest.mark.parametrize("value", [math.nan, math.inf, -math.inf])
def test_nonfinite_json_values_are_rejected_recursively(value):
    with pytest.raises(ValueError):
        assert_finite({"meta": {}, "stations": [{"sales_eok": value}]})


def test_coordinates_prefer_same_line_without_inventing_averages():
    rows = [coordinate(line="3호선", lat="37.6", station="2"), coordinate()]
    assert coordinates_for("가(별칭)", "2호선", rows) == (37.5, 127.0)
    assert coordinates_for("없는역", "2호선", rows) == (None, None)
    assert coordinates_for("가", "다른선", rows) == (None, None)
    assert coordinates_for("가", "9호선2~3단계", [coordinate(line="9호선")]) == (37.5, 127.0)


@pytest.mark.parametrize("lat,lng", [("", "127"), ("nan", "127"), ("37.5", "inf"), ("0", "0")])
def test_invalid_coordinates_are_null(lat, lng):
    assert coordinates_for("가", "2호선", [coordinate(lat=lat, lng=lng)]) == (None, None)


def test_station_id_preserves_original_name_identity():
    assert station_id("신촌") == station_id("신촌")
    assert len({station_id("신촌"), station_id("신촌(지하)"), station_id("신촌(경의선)")}) == 3


def test_public_file_list_and_nearest_available_month():
    page = '<span title="CARD_SUBWAY_MONTH_202604.csv" onclick="javascript:downloadFile(\'1\');">A</span>'
    assert listed_files(page) == [("CARD_SUBWAY_MONTH_202604.csv", "1")]
    files = [("CARD_SUBWAY_MONTH_202606.csv", "2"), ("CARD_SUBWAY_MONTH_202604.csv", "1"),
             ("CARD_SUBWAY_MONTH_2025.csv", "3")]
    assert nearest_month(files, "202605") == files[1]
    assert nearest_month(files + [("CARD_SUBWAY_MONTH_202605.csv", "4")], "202605")[1] == "4"
    with pytest.raises(ValueError):
        nearest_month([], "202605")


def test_document_period_metadata_and_substitution():
    subway_rows = [subway("가", 100, 100, date="20260401"), subway("나", 200, 200, date="20260401"),
                   subway("다", 300, 300, date="20260401")]
    commercial_rows = [commercial(f"{name}역", amount, quarter=f"2025{quarter}")
                       for name, amount in [("가", 200), ("나", 100), ("다", 400)] for quarter in range(1, 5)]
    stations, summary = build_documents(subway_rows, commercial_rows, [], "2026-10-22T00:00:00Z")
    assert stations["meta"] == summary["meta"]
    assert summary["meta"]["subway_substituted"] is True
    assert "202604" in summary["meta"]["substitution_note"]
    assert summary["n_stations"] == 3
    with pytest.raises(ValueError, match="한 달"):
        build_documents(subway_rows + [subway("라", 2, 2)], commercial_rows, [], "2026-10-22T00:00:00Z")
    with pytest.raises(ValueError, match="전체 분기"):
        build_documents(subway_rows, commercial_rows[:1], [], "2026-10-22T00:00:00Z")
