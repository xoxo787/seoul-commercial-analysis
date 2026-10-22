import { describe, expect, it } from 'vitest';
import { fixtureMeta, fixtureStations, fixtureSummary } from '../../tests/fixtures/data';
import { parseData } from './load';

const input = () => structuredClone({ meta: fixtureMeta, stations: fixtureStations });

describe('화면 데이터 계약', () => {
  it('두 문서를 검증하고 원본 데이터를 유지한다', () => {
    expect(parseData(input(), fixtureSummary).stationsData.stations).toEqual(fixtureStations);
  });
  it('역 수가 다르거나 역 id가 중복되면 부분 화면을 보여주지 않는다', () => {
    expect(() => parseData(input(), { ...fixtureSummary, n_stations: 99 })).toThrow('대상 수');
    const duplicates = input();
    duplicates.stations[1].id = duplicates.stations[0].id;
    expect(() => parseData(duplicates, fixtureSummary)).toThrow('대상 수');
  });
  it('NaN, 알 수 없는 판정, 잘못된 업종 목록을 거부한다', () => {
    const invalid = input();
    invalid.stations[0].sales_eok = NaN;
    expect(() => parseData(invalid, fixtureSummary)).toThrow('숫자');
    expect(() => parseData({ ...input(), stations: [{ ...fixtureStations[0], verdict: '미정' }] }, fixtureSummary)).toThrow('판정');
    expect(() => parseData({ ...input(), stations: [{ ...fixtureStations[0], industries: null }] }, fixtureSummary)).toThrow('목록');
  });
  it('다른 시점의 문서와 존재하지 않는 Top 역 참조를 거부한다', () => {
    expect(() => parseData(input(), { ...fixtureSummary, meta: { ...fixtureMeta, generated_at: '2026-05-21T12:00:00Z' } })).toThrow('버전');
    expect(() => parseData(input(), { ...fixtureSummary, top_gems: [{ ...fixtureSummary.top_gems[0], id: 'missing' }] })).toThrow('알 수 없는 역');
  });
});
