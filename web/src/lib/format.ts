const integer = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatPassengers(value: number): string {
  return Number.isFinite(value) ? `${integer.format(value)}명` : '자료 없음';
}

export function formatSales(value: number): string {
  return Number.isFinite(value) ? `${decimal.format(value)}억원` : '자료 없음';
}

export function formatGap(value: number): string {
  return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${integer.format(value)}` : '자료 없음';
}

export function formatMonth(value: string): string {
  return /^\d{4}(0[1-9]|1[0-2])$/.test(value) ? `${value.slice(0, 4)}년 ${Number(value.slice(4))}월` : value;
}

export function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '생성 시각 확인 필요' : `${new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Seoul',
  }).format(date)} (한국 시간)`;
}

export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
