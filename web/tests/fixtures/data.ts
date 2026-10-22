import type { Meta, Station, SummaryData } from '../../src/lib/types';

// Synthetic values for tests only. Never served from public/data or imported by the app.
export const fixtureMeta: Meta = {
  sources: [{ name: '테스트 자료', dataset_id: 'OA-12914', url: 'https://example.com/test', period: '테스트 전용', license: '테스트 전용' }],
  subway_month: '202604', subway_month_requested: '202605', subway_substituted: true,
  substitution_note: '테스트: 요청 월 대신 이전 월을 사용했습니다.', commercial_period: '테스트 분기',
  generated_at: '2026-05-20T12:00:00Z', generator: 'scripts/build_data.py',
};

function station(overrides: Partial<Station>): Station {
  return {
    id: 'test-garam', name: '가람(테스트)', line: 'A노선', lat: null, lng: null,
    flow_type: '균형형', daily_passengers: 12345, pass_rank: 1, sales_eok: 100,
    sales_rank: 4, gap: 3, verdict: '거품', commercial_area: '가람역 테스트 상권',
    commercial_areas_matched: ['가람역 테스트 상권'],
    industries: [{ name: '커피-음료', sales_eok: 80, rank: 1 }, { name: '한식음식점', sales_eok: 20, rank: 2 }],
    explanation: '테스트 자료입니다. 유동인구 1위, 매출 4위로 격차는 +3단계입니다.',
    ...overrides,
  };
}

export const fixtureStations: Station[] = [
  station({}),
  station({ id: 'test-naru', name: '나루(테스트)', line: '2호선', pass_rank: 2, sales_rank: 2, sales_eok: 200, gap: 0, verdict: '보통', industries: [{ name: '커피-음료', sales_eok: 120, rank: 1 }] }),
  station({ id: 'test-dasol', name: '다솔(테스트)', line: '3호선', pass_rank: 3, sales_rank: 1, sales_eok: 300, gap: -2, verdict: '알짜', industries: [{ name: '한식음식점', sales_eok: 300, rank: 1 }] }),
  station({ id: 'test-raon', name: '라온(테스트)', pass_rank: 4, sales_rank: 3, sales_eok: 150, gap: -1, verdict: '알짜', industries: [{ name: '커피-음료', sales_eok: 120, rank: 1 }, { name: '한식음식점', sales_eok: 0, rank: 2 }] }),
];

export const fixtureSummary: SummaryData = {
  meta: fixtureMeta,
  n_stations: fixtureStations.length,
  regression: { r2: 0.2, slope: 1, intercept: 2, p_value: 0.1, x_unit: '일평균 승하차(만 명)', y_unit: '억원' },
  spearman: { rho: 0.4, p_value: 0.1 },
  readme_reference: { r2: 0.164, rho: 0.574, note: '테스트 기준 기간과 분석 범위가 다릅니다.' },
  verdict_threshold: 1,
  top_gems: [fixtureStations[2], fixtureStations[3]],
  top_bubbles: [fixtureStations[0]],
  industries: ['커피-음료', '한식음식점'],
};
