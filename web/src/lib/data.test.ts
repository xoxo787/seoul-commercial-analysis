import { describe, expect, it } from 'vitest';
import { fixtureStations, fixtureSummary } from '../../tests/fixtures/data';
import { differsFromReference, filterStations, hasCoordinates, recommendByIndustry, verdictPresentation } from './data';

describe('역 검색', () => {
  it('공백을 무시하고 역명·노선·상권을 검색하며 원래 순서를 보존한다', () => {
    expect(filterStations(fixtureStations, '나 루').map((station) => station.id)).toEqual(['test-naru']);
    expect(filterStations(fixtureStations, ' 2 호선 ').map((station) => station.id)).toEqual(['test-naru']);
    expect(filterStations(fixtureStations, 'Ａ노선').map((station) => station.id)).toEqual(['test-garam', 'test-raon']);
    expect(filterStations(fixtureStations, '테스트 상권')).toHaveLength(4);
  });
  it('빈 검색어는 전체를, 일치하지 않는 검색어는 빈 목록을 반환한다', () => {
    expect(filterStations(fixtureStations, '  ')).toEqual(fixtureStations);
    expect(filterStations(fixtureStations, '없는역')).toEqual([]);
  });
});

describe('업종 추천', () => {
  it('매출 내림차순으로 정렬하고 동률이면 가나다순이며 원본을 바꾸지 않는다', () => {
    const original = structuredClone(fixtureStations);
    const ranked = recommendByIndustry(fixtureStations, '커피-음료');
    expect(ranked.map(({ station }) => station.id)).toEqual(['test-naru', 'test-raon', 'test-garam']);
    expect(ranked.map((entry) => entry.sales_eok)).toEqual([120, 120, 80]);
    expect(fixtureStations).toEqual(original);
  });
  it('매출이 없거나 0인 업종을 제외하고 개수 제한을 적용한다', () => {
    expect(recommendByIndustry(fixtureStations, '한식음식점').map(({ station }) => station.id)).toEqual(['test-dasol', 'test-garam']);
    expect(recommendByIndustry(fixtureStations, '커피-음료', 1)[0].station.id).toBe('test-naru');
    expect(recommendByIndustry(fixtureStations, '없는업종')).toEqual([]);
    expect(recommendByIndustry(fixtureStations, '커피-음료', -1)).toEqual([]);
  });
});

describe('지도와 판정 표시', () => {
  it('좌표가 없거나 유효 범위를 벗어나면 지도에서 제외한다', () => {
    expect(hasCoordinates(fixtureStations[0])).toBe(false);
    expect(hasCoordinates({ ...fixtureStations[0], lat: 37.5, lng: 127 })).toBe(true);
    expect(hasCoordinates({ ...fixtureStations[0], lat: 91, lng: 127 })).toBe(false);
    expect(hasCoordinates({ ...fixtureStations[0], lat: 37.5, lng: null })).toBe(false);
    expect(hasCoordinates({ ...fixtureStations[0], lat: NaN, lng: 127 })).toBe(false);
  });
  it('알짜와 거품의 순위 해석 방향이 반대이며 보통은 기준 이내이다', () => {
    expect(verdictPresentation('알짜').label).toContain('매출 순위가 높아요');
    expect(verdictPresentation('거품').label).toContain('매출 순위가 낮아요');
    expect(verdictPresentation('보통').label).toContain('기준 이내');
  });
  it('README 표시 정밀도 또는 원인 설명이 다르면 비교를 보여준다', () => {
    expect(differsFromReference(fixtureSummary)).toBe(true);
    const same = { ...fixtureSummary, readme_reference: { r2: 0.2, rho: 0.4, note: '일치' } };
    expect(differsFromReference(same)).toBe(false);
    expect(differsFromReference({ ...same, readme_reference: { ...same.readme_reference, note: '분석 대상이 다릅니다.' } })).toBe(true);
  });
});
