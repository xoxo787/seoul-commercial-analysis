"""CI는 커밋된 JSON만 검증한다. 네트워크나 data/raw의 원본은 필요 없다."""

import copy
import json
import math
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[1]
TEXT = {"type": "string", "minLength": 1}
NUMBER = {"type": "number"}
POSITIVE = {"type": "number", "exclusiveMinimum": 0}
NONNEGATIVE = {"type": "number", "minimum": 0}
RANK = {"type": "integer", "minimum": 1}
PROBABILITY = {"type": "number", "minimum": 0, "maximum": 1}


def obj(properties, *, additional=False):
    return {"type": "object", "properties": properties, "required": list(properties),
            "additionalProperties": additional}


SOURCE = obj({"name": TEXT, "dataset_id": {"enum": ["OA-12914", "OA-15572", "station-coords"]},
              "url": {"type": "string", "format": "uri"}, "period": TEXT, "license": TEXT})
META = obj({
    "sources": {"type": "array", "items": SOURCE, "minItems": 3},
    "subway_month": {"type": "string", "pattern": r"^\d{4}(0[1-9]|1[0-2])$"},
    "subway_month_requested": {"const": "202605"}, "subway_substituted": {"type": "boolean"},
    "substitution_note": {"type": ["string", "null"]}, "commercial_period": TEXT,
    "generated_at": {"type": "string", "format": "date-time", "pattern": "Z$"},
    "generator": {"const": "scripts/build_data.py"},
}, additional=True)
INDUSTRY = obj({"name": TEXT, "sales_eok": NONNEGATIVE, "rank": RANK})
STATION = obj({
    "id": TEXT, "name": TEXT, "line": TEXT,
    "lat": {"type": ["number", "null"], "minimum": -90, "maximum": 90},
    "lng": {"type": ["number", "null"], "minimum": -180, "maximum": 180},
    "flow_type": {"enum": ["도착형", "출발형", "균형형"]}, "daily_passengers": POSITIVE,
    "pass_rank": RANK, "sales_eok": POSITIVE, "sales_rank": RANK, "gap": {"type": "integer"},
    "verdict": {"enum": ["알짜", "거품", "보통"]}, "commercial_area": TEXT,
    "commercial_areas_matched": {"type": "array", "items": TEXT, "minItems": 1, "uniqueItems": True},
    "industries": {"type": "array", "items": INDUSTRY, "minItems": 1}, "explanation": TEXT,
})
BRIEF = obj({"id": TEXT, "name": TEXT, "pass_rank": RANK, "sales_rank": RANK, "gap": {"type": "integer"}})
STATIONS_SCHEMA = obj({"meta": META, "stations": {"type": "array", "items": STATION, "minItems": 3}})
SUMMARY_SCHEMA = obj({
    "meta": META, "n_stations": {"type": "integer", "minimum": 3},
    "regression": obj({"r2": PROBABILITY, "slope": NUMBER, "intercept": NUMBER, "p_value": PROBABILITY,
                       "x_unit": {"const": "일평균 승하차(만 명)"}, "y_unit": {"const": "억원"}}),
    "spearman": obj({"rho": {"type": "number", "minimum": -1, "maximum": 1}, "p_value": PROBABILITY}),
    "readme_reference": obj({"r2": {"const": 0.164}, "rho": {"const": 0.574}, "note": TEXT}),
    "verdict_threshold": RANK,
    "top_gems": {"type": "array", "items": BRIEF, "maxItems": 10},
    "top_bubbles": {"type": "array", "items": BRIEF, "maxItems": 10},
    "industries": {"type": "array", "items": TEXT, "minItems": 1, "uniqueItems": True},
})


def reject_nonfinite(value):
    raise ValueError(f"JSON number가 아닌 값: {value}")


def validate_finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for child in value.values():
            validate_finite(child)
    elif isinstance(value, list):
        for child in value:
            validate_finite(child)


@pytest.fixture(scope="module")
def documents():
    return tuple(json.loads((ROOT / "web/public/data" / name).read_text(encoding="utf-8"), parse_constant=reject_nonfinite)
                 for name in ("stations.json", "summary.json"))


def test_generated_documents_schema_and_finite_numbers(documents):
    for doc, schema in zip(documents, (STATIONS_SCHEMA, SUMMARY_SCHEMA)):
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema, format_checker=FormatChecker()).validate(doc)
        validate_finite(doc)


def test_rank_order_gap_verdict_and_industry_totals(documents):
    station_doc, summary = documents
    stations = station_doc["stations"]
    n = len(stations)
    assert summary["n_stations"] == n
    assert len({r["id"] for r in stations}) == len({r["name"] for r in stations}) == n
    assert [r["pass_rank"] for r in stations] == list(range(1, n + 1))
    assert sorted(r["sales_rank"] for r in stations) == list(range(1, n + 1))
    assert [r["daily_passengers"] for r in stations] == sorted((r["daily_passengers"] for r in stations), reverse=True)
    sales = sorted(stations, key=lambda row: row["sales_rank"])
    assert [r["sales_eok"] for r in sales] == sorted((r["sales_eok"] for r in stations), reverse=True)
    threshold = math.ceil(n / 10)
    assert summary["verdict_threshold"] == threshold
    for row in stations:
        gap = row["sales_rank"] - row["pass_rank"]
        assert row["gap"] == gap
        expected = "알짜" if gap <= -threshold else "거품" if gap >= threshold else "보통"
        assert row["verdict"] == expected
        assert row["commercial_area"] in row["commercial_areas_matched"]
        assert (row["lat"] is None) == (row["lng"] is None)
        industries = row["industries"]
        assert len({i["name"] for i in industries}) == len(industries)
        assert [i["rank"] for i in industries] == list(range(1, len(industries) + 1))
        assert [i["sales_eok"] for i in industries] == sorted((i["sales_eok"] for i in industries), reverse=True)
        assert math.isclose(sum(i["sales_eok"] for i in industries), row["sales_eok"], rel_tol=1e-12)
        assert all(i["name"] in summary["industries"] for i in industries)


def test_summary_matches_station_records_and_provenance(documents):
    station_doc, summary = documents
    assert station_doc["meta"] == summary["meta"]
    meta = summary["meta"]
    assert {s["dataset_id"] for s in meta["sources"]} == {"OA-12914", "OA-15572", "station-coords"}
    assert meta["subway_substituted"] == (meta["subway_month"] != meta["subway_month_requested"])
    if meta["subway_substituted"]:
        assert meta["substitution_note"]
    else:
        assert meta["substitution_note"] is None
    assert summary["industries"] == sorted(summary["industries"])
    stations = station_doc["stations"]
    for key, direction in (("top_gems", 1), ("top_bubbles", -1)):
        expected = sorted(stations, key=lambda r: (direction * r["gap"], r["pass_rank"]))[:10]
        assert summary[key] == [{k: row[k] for k in BRIEF["required"]} for row in expected]


def test_statistics_independently_recomputed_from_generated_records(documents):
    # SciPy나 생성 함수 없이 중심화 합과 순위 차이 공식으로 검증한다.
    station_doc, summary = documents
    stations = station_doc["stations"]
    n = len(stations)
    x = [r["daily_passengers"] / 10_000 for r in stations]
    y = [r["sales_eok"] for r in stations]
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((value - mx) ** 2 for value in x)
    syy = sum((value - my) ** 2 for value in y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    assert summary["regression"]["r2"] == pytest.approx(sxy ** 2 / (sxx * syy), abs=1e-12)
    assert summary["regression"]["slope"] == pytest.approx(sxy / sxx)
    assert summary["regression"]["intercept"] == pytest.approx(my - sxy / sxx * mx)
    rho = 1 - 6 * sum(r["gap"] ** 2 for r in stations) / (n * (n ** 2 - 1))
    assert summary["spearman"]["rho"] == pytest.approx(rho, abs=1e-12)


@pytest.mark.parametrize("field,value", [("gap", "1"), ("verdict", "추천"), ("flow_type", "모름"),
                                       ("pass_rank", 0), ("sales_eok", -1), ("lat", 91)])
def test_schema_rejects_invalid_station_values(documents, field, value):
    bad = copy.deepcopy(documents[0]["stations"][0])
    bad[field] = value
    with pytest.raises(ValidationError):
        Draft202012Validator(STATION).validate(bad)


def test_schema_rejects_missing_required_fields(documents):
    bad = dict(documents[0]["stations"][0])
    del bad["industries"]
    with pytest.raises(ValidationError):
        Draft202012Validator(STATION).validate(bad)


@pytest.mark.parametrize("token", ["NaN", "Infinity", "-Infinity"])
def test_nonstandard_json_number_is_rejected(token):
    with pytest.raises(ValueError):
        json.loads('{"sales_eok":' + token + '}', parse_constant=reject_nonfinite)
