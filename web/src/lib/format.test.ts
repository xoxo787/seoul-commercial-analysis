import { describe, expect, it } from 'vitest';
import { escapeHtml, formatGap, formatGeneratedAt, formatMonth, formatPassengers, formatSales, safeSourceUrl } from './format';

describe('한국어 표시', () => {
  it('승객은 명 단위, 매출은 억원 단위를 유지한다', () => {
    expect(formatPassengers(12345.6)).toBe('12,346명');
    expect(formatSales(1234.56)).toBe('1,234.6억원');
    expect(formatSales(0)).toBe('0.0억원');
  });
  it('잘못된 숫자를 0으로 바꾸지 않는다', () => {
    expect(formatSales(NaN)).toBe('자료 없음');
    expect(formatPassengers(Infinity)).toBe('자료 없음');
    expect(formatGap(NaN)).toBe('자료 없음');
  });
  it('격차 부호를 보존하고 0에는 양수 기호를 붙이지 않는다', () => {
    expect(formatGap(-23)).toBe('-23');
    expect(formatGap(23)).toBe('+23');
    expect(formatGap(0)).toBe('0');
  });
  it('월을 변환하고 생성 시각에는 한국 시간대를 명시한다', () => {
    expect(formatMonth('202605')).toBe('2026년 5월');
    expect(formatMonth('202613')).toBe('202613');
    expect(formatGeneratedAt('2026-05-20T12:00:00Z')).toContain('21:00');
    expect(formatGeneratedAt('2026-05-20T12:00:00Z')).toContain('한국 시간');
    expect(formatGeneratedAt('invalid')).toBe('생성 시각 확인 필요');
  });
});

describe('외부 데이터의 안전한 렌더링', () => {
  it('태그와 속성 경계를 이스케이프한다', () => {
    expect(escapeHtml('<img src="x" onerror=\'alert(1)\'>&')).toBe('&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
  });
  it('출처 링크는 HTTP(S)만 허용한다', () => {
    expect(safeSourceUrl('https://data.seoul.go.kr/source')).toBe('https://data.seoul.go.kr/source');
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
    expect(safeSourceUrl('not a URL')).toBeNull();
  });
});
