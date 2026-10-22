import type { Meta, Station, StationsData, SummaryData } from './types';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('데이터 객체 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}

function textFields(item: Record<string, unknown>, fields: string[]): void {
  if (fields.some((field) => typeof item[field] !== 'string')) throw new Error('데이터의 필수 문자열을 확인해 주세요.');
}

function numberFields(item: Record<string, unknown>, fields: string[]): void {
  if (fields.some((field) => typeof item[field] !== 'number' || !Number.isFinite(item[field]))) {
    throw new Error('데이터의 숫자 값이 올바르지 않습니다.');
  }
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('데이터 목록 형식이 올바르지 않습니다.');
  return value;
}

function strings(value: unknown): void {
  if (array(value).some((item) => typeof item !== 'string')) throw new Error('데이터의 이름 목록을 확인해 주세요.');
}

function validateMeta(value: unknown): asserts value is Meta {
  const meta = record(value);
  textFields(meta, ['subway_month', 'subway_month_requested', 'commercial_period', 'generated_at', 'generator']);
  if (typeof meta.subway_substituted !== 'boolean'
    || (meta.substitution_note !== null && typeof meta.substitution_note !== 'string')) {
    throw new Error('데이터의 기준월 대체 정보를 확인해 주세요.');
  }
  for (const source of array(meta.sources)) {
    textFields(record(source), ['name', 'dataset_id', 'url', 'period', 'license']);
  }
  if (meta.methodology !== undefined) strings(meta.methodology);
}

function validateStation(value: unknown): asserts value is Station {
  const station = record(value);
  textFields(station, ['id', 'name', 'line', 'flow_type', 'verdict', 'commercial_area', 'explanation']);
  numberFields(station, ['daily_passengers', 'pass_rank', 'sales_eok', 'sales_rank', 'gap']);
  if (!['알짜', '거품', '보통'].includes(String(station.verdict))) throw new Error('알 수 없는 역 판정입니다.');
  for (const key of ['lat', 'lng']) {
    if (station[key] !== null) numberFields(station, [key]);
  }
  strings(station.commercial_areas_matched);
  for (const industry of array(station.industries)) {
    const entry = record(industry);
    textFields(entry, ['name']);
    numberFields(entry, ['sales_eok', 'rank']);
  }
}

/** Validate the display contract before exposing any partially loaded dashboard. */
export function parseData(stationsInput: unknown, summaryInput: unknown): {
  stationsData: StationsData;
  summary: SummaryData;
} {
  const stationsData = record(stationsInput);
  const summary = record(summaryInput);
  validateMeta(stationsData.meta);
  validateMeta(summary.meta);
  const stations = array(stationsData.stations);
  stations.forEach(validateStation);
  if (stations.length === 0) throw new Error('분석 대상 역이 없습니다.');
  numberFields(summary, ['n_stations', 'verdict_threshold']);
  const ids = new Set(stations.map((station) => (station as Station).id));
  if (ids.size !== stations.length || summary.n_stations !== stations.length) {
    throw new Error('역 목록과 요약의 분석 대상 수가 일치하지 않습니다.');
  }
  numberFields(record(summary.regression), ['r2', 'slope', 'intercept', 'p_value']);
  numberFields(record(summary.spearman), ['rho', 'p_value']);
  const reference = record(summary.readme_reference);
  numberFields(reference, ['r2', 'rho']);
  textFields(reference, ['note']);
  strings(summary.industries);
  for (const entry of [...array(summary.top_gems), ...array(summary.top_bubbles)]) {
    const ranked = record(entry);
    textFields(ranked, ['id', 'name']);
    numberFields(ranked, ['pass_rank', 'sales_rank', 'gap']);
    if (!ids.has(String(ranked.id))) throw new Error('순위 목록에서 알 수 없는 역을 참조합니다.');
  }
  if (stationsData.meta.generated_at !== summary.meta.generated_at
    || stationsData.meta.subway_month !== summary.meta.subway_month
    || stationsData.meta.commercial_period !== summary.meta.commercial_period) {
    throw new Error('역 목록과 요약의 데이터 버전이 다릅니다. 새로고침해 주세요.');
  }
  return { stationsData: stationsData as unknown as StationsData, summary: summary as unknown as SummaryData };
}

export async function loadData() {
  const base = import.meta.env.BASE_URL;
  const responses = await Promise.all(['stations.json', 'summary.json'].map(async (name) => {
    const response = await fetch(`${base}data/${name}`);
    if (!response.ok) throw new Error(`분석 데이터를 불러오지 못했습니다 (${response.status}).`);
    return response.json() as Promise<unknown>;
  }));
  return parseData(responses[0], responses[1]);
}
