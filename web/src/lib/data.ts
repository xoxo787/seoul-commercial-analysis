import type { Station, SummaryData, Verdict } from './types';

const collator = new Intl.Collator('ko');
const normalizeSearch = (value: string): string => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '');

/** Search station names, lines and the representative commercial area. */
export function filterStations(stations: readonly Station[], query: string): Station[] {
  const needle = normalizeSearch(query);
  if (!needle) return [...stations];
  return stations.filter((station) =>
    [station.name, station.line, station.commercial_area].some((value) => normalizeSearch(value).includes(needle)),
  );
}

/** Missing and zero sales are not recommendations; ties use name then stable id. */
export function recommendByIndustry(stations: readonly Station[], industry: string, limit = 10) {
  return stations.flatMap((station) => {
    const sales = station.industries.find((item) => item.name === industry)?.sales_eok;
    return sales !== undefined && Number.isFinite(sales) && sales > 0 ? [{ station, sales_eok: sales }] : [];
  }).sort((a, b) => b.sales_eok - a.sales_eok
    || collator.compare(a.station.name, b.station.name)
    || a.station.id.localeCompare(b.station.id)).slice(0, Math.max(0, limit));
}

export function hasCoordinates(station: Station): station is Station & { lat: number; lng: number } {
  return typeof station.lat === 'number' && Number.isFinite(station.lat) && Math.abs(station.lat) <= 90
    && typeof station.lng === 'number' && Number.isFinite(station.lng) && Math.abs(station.lng) <= 180;
}

export function verdictPresentation(verdict: Verdict): { className: string; label: string } {
  const presentations = {
    '알짜': { className: 'gem', label: '유동인구 순위보다 매출 순위가 높아요' },
    '거품': { className: 'bubble', label: '유동인구 순위보다 매출 순위가 낮아요' },
    '보통': { className: 'neutral', label: '두 순위의 차이가 판정 기준 이내예요' },
  };
  return presentations[verdict];
}

export function differsFromReference(summary: SummaryData): boolean {
  return summary.regression.r2.toFixed(3) !== summary.readme_reference.r2.toFixed(3)
    || summary.spearman.rho.toFixed(3) !== summary.readme_reference.rho.toFixed(3)
    || summary.readme_reference.note.trim() !== '일치';
}
