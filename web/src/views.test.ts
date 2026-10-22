import { describe, expect, it } from 'vitest';
import { fixtureStations, fixtureSummary } from '../tests/fixtures/data';
import { renderDetail, renderSearchResults, renderShell } from './views';

describe('화면의 출처와 접근성 정보', () => {
  it('대체 기준월과 기존·재계산 수치 및 차이 원인을 모두 보여준다', () => {
    const html = renderShell(fixtureStations, fixtureSummary);
    expect(html).toContain('기준월 대체 자료');
    expect(html).toContain('2026년 4월');
    expect(html).toContain('README 기준: R² 0.164, ρ 0.574');
    expect(html).toContain('이번 계산: R² 0.200, ρ 0.400');
    expect(html).toContain(fixtureSummary.readme_reference.note);
    expect(html).toContain('이용 조건: 테스트 전용');
  });
  it('좌표가 없는 역도 검색 목록과 상세에 남기고 선택 상태를 알린다', () => {
    const station = fixtureStations[0];
    expect(renderSearchResults(fixtureStations, station.id)).toContain('aria-pressed="true"');
    const detail = renderDetail(station, fixtureSummary);
    expect(detail).toContain('좌표 자료가 없어');
    expect(detail).toContain('차트 수치 표로 보기');
    expect(detail).toContain(station.explanation);
  });
  it('역 이름과 설명에서 HTML을 실행하지 않는다', () => {
    const html = renderDetail({ ...fixtureStations[0], name: '<script>boom</script>', explanation: '<img onerror="x">' }, fixtureSummary);
    expect(html).not.toContain('<script>boom</script>');
    expect(html).toContain('&lt;script&gt;boom&lt;/script&gt;');
    expect(html).not.toContain('<img onerror=');
  });
});
