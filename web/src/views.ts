import { differsFromReference, hasCoordinates, verdictPresentation } from './lib/data';
import { escapeHtml as e, formatGap, formatGeneratedAt, formatMonth, formatPassengers, formatSales, safeSourceUrl } from './lib/format';
import type { Meta, RankedStation, Station, SummaryData } from './lib/types';

export function badge(station: Station): string {
  return `<span class="badge ${verdictPresentation(station.verdict).className}">${e(station.verdict)}</span>`;
}

function topList(items: RankedStation[], kind: 'gem' | 'bubble'): string {
  if (!items.length) return '<p class="empty-state">해당 기준에 맞는 역이 없습니다.</p>';
  return `<ol class="top-list">${items.map((item, index) => `<li>
    <button class="top-station" data-station-id="${e(item.id)}" aria-label="${e(item.name)} 역 상세 보기">
      <span class="list-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="top-name">${e(item.name)}</span>
      <span class="rank-route"><span class="sr-only">유동인구 </span>${item.pass_rank}<span aria-hidden="true"> → </span><span class="sr-only">위, 매출 </span>${item.sales_rank}<span class="sr-only">위</span></span>
      <strong class="gap-text ${kind}">${formatGap(item.gap)}</strong>
    </button>
  </li>`).join('')}</ol>`;
}

function provenance(meta: Meta, count: number): string {
  return `<section class="sources-section" id="sources" aria-labelledby="sources-title">
    <div class="section-heading"><div><p class="eyebrow">데이터를 읽는 기준</p><h2 id="sources-title">출처와 분석 범위</h2></div><span class="section-index">04</span></div>
    <div class="provenance-grid">
      <div><dl class="source-facts">
        <div><dt>지하철 기준월</dt><dd>${e(formatMonth(meta.subway_month))}${meta.subway_substituted ? ' · 대체 자료 사용' : ''}</dd></div>
        <div><dt>요청 기준월</dt><dd>${e(formatMonth(meta.subway_month_requested))}</dd></div>
        <div><dt>상권 매출 기간</dt><dd>${e(meta.commercial_period)}</dd></div>
        <div><dt>생성 시각</dt><dd><time datetime="${e(meta.generated_at)}">${e(formatGeneratedAt(meta.generated_at))}</time></dd></div>
      </dl>
      ${meta.subway_substituted ? `<p class="source-note">${e(meta.substitution_note ?? '공개된 다른 기준월의 자료를 사용했습니다.')}</p>` : ''}
      <p class="source-note">역명과 상권명을 연결할 수 있고 매출이 있는 ${count}개 역을 비교했습니다. 매출은 역에 연결된 대표 상권의 합계로, 역 주변 전체 상권이나 개별 점포의 매출을 뜻하지 않습니다. 기준 기간이 다른 자료의 비교이며, 순위 차이로 수익성이나 인과관계를 판단할 수 없습니다.</p>
      ${meta.methodology?.length ? `<details class="methodology"><summary>집계 방법 자세히 보기</summary><ul>${meta.methodology.map((note) => `<li>${e(note)}</li>`).join('')}</ul></details>` : ''}</div>
      <ul class="source-list">${meta.sources.map((source) => {
        const url = safeSourceUrl(source.url);
        return `<li><span class="source-id">${e(source.dataset_id)}</span>
          ${url ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(source.name)} <span aria-hidden="true">↗</span><span class="sr-only"> (새 탭)</span></a>` : `<strong>${e(source.name)}</strong>`}
          <p>${e(source.period)}</p><p class="license">이용 조건: ${e(source.license)}</p></li>`;
      }).join('')}</ul>
    </div>
  </section>`;
}

export function renderShell(stations: Station[], summary: SummaryData): string {
  const meta = summary.meta;
  const difference = differsFromReference(summary);
  const gems = summary.top_gems.filter((item) => item.gap <= -summary.verdict_threshold);
  const bubbles = summary.top_bubbles.filter((item) => item.gap >= summary.verdict_threshold);
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="#overview"><span class="brand-mark" aria-hidden="true">서</span><span>서울 상권 탐색<small>지하철 × 상권 데이터</small></span></a>
    <nav aria-label="주요 메뉴"><a href="#explore">역별 탐색</a><a href="#sources">데이터 출처</a></nav>
  </div></header>
  <main class="page-shell">
    <section class="hero" id="overview" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="eyebrow">사람의 흐름, 소비의 흐름</p>
        <h1 id="hero-title">유동인구<span class="not-equal">≠</span>매출</h1>
        <p class="hero-description">많이 지나가는 역과 많이 소비하는 상권.<br />두 순위의 차이에서 서울의 다른 얼굴을 발견하세요.</p>
        <div class="hero-tags"><span>분석 대상 <strong>${summary.n_stations}개 역</strong></span><span>승하차 ${e(formatMonth(meta.subway_month))}</span></div>
      </div>
      <div class="metric-grid">
        <article class="metric-card"><p>유동인구로 설명되는 매출 변동</p><div class="metric-value">${(summary.regression.r2 * 100).toFixed(1)}<span>%</span></div><p class="metric-caption">선형회귀 R² <strong data-testid="r2">${summary.regression.r2.toFixed(3)}</strong></p></article>
        <article class="metric-card"><p>유동인구와 매출의 순위 상관</p><div class="metric-value" data-testid="rho">${summary.spearman.rho.toFixed(3)}</div><p class="metric-caption">Spearman ρ <span>−1 ~ 1</span></p></article>
      </div>
    </section>
    ${meta.subway_substituted ? `<aside class="data-alert" role="note" data-testid="substitution-notice"><strong>기준월 대체 자료를 사용했습니다</strong><p>요청: ${e(formatMonth(meta.subway_month_requested))} → 실제 사용: ${e(formatMonth(meta.subway_month))}. ${e(meta.substitution_note ?? '')}</p></aside>` : ''}
    ${difference ? `<aside class="reference-note" data-testid="reference-note"><strong>기존 분석과 재계산 결과가 다릅니다</strong><p>README 기준: R² ${summary.readme_reference.r2.toFixed(3)}, ρ ${summary.readme_reference.rho.toFixed(3)} · 이번 계산: R² ${summary.regression.r2.toFixed(3)}, ρ ${summary.spearman.rho.toFixed(3)}</p><p>${e(summary.readme_reference.note)}</p></aside>` : ''}
    <section class="rankings-section" aria-labelledby="rankings-title">
      <div class="section-heading"><div><p class="eyebrow">순위의 간격에서 찾은 역</p><h2 id="rankings-title">사람보다 매출, 매출보다 사람</h2></div><span class="section-index">01</span></div>
      <p class="section-description">격차 = 매출 순위 − 유동인구 순위. 음수일수록 유동인구 대비 매출 순위가 높습니다. 판정 기준은 ±${summary.verdict_threshold}단계입니다.</p>
      <div class="rankings-grid">
        <article class="ranking-card gem-card"><div class="ranking-heading"><h3><span class="legend-dot gem"></span>알짜 <span>TOP ${gems.length}</span></h3><p>유동인구보다 매출 순위가 높은 곳</p></div><div class="ranking-columns"><span>역 이름</span><span>유동 → 매출</span><span>격차</span></div>${topList(gems, 'gem')}</article>
        <article class="ranking-card bubble-card"><div class="ranking-heading"><h3><span class="legend-dot bubble"></span>거품 <span>TOP ${bubbles.length}</span></h3><p>매출보다 유동인구 순위가 높은 곳</p></div><div class="ranking-columns"><span>역 이름</span><span>유동 → 매출</span><span>격차</span></div>${topList(bubbles, 'bubble')}</article>
      </div>
    </section>
    <section class="explore-section" id="explore" aria-labelledby="explore-title">
      <div class="section-heading"><div><p class="eyebrow">한 역씩 자세히 보기</p><h2 id="explore-title">어느 역이 궁금하세요?</h2></div><span class="section-index">02</span></div>
      <div class="explore-grid">
        <div class="explorer-panel panel">
          <form class="search-form" role="search"><label for="station-search">역 이름·노선·상권 검색</label><div class="search-input-wrap"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="station-search" type="search" placeholder="예: 강남, 2호선" autocomplete="off" aria-controls="station-results" aria-describedby="search-count" /><button type="button" id="clear-search" aria-label="검색어 지우기">지우기</button></div></form>
          <p id="search-count" class="search-count" role="status" aria-live="polite"></p>
          <ul id="station-results" class="station-results" aria-label="검색된 역"></ul>
          <div class="map-heading"><h3>지도에서 선택</h3><div class="map-legend"><span><i class="legend-dot gem"></i>알짜</span><span><i class="legend-dot bubble"></i>거품</span><span><i class="legend-dot neutral"></i>보통</span></div></div>
          <div id="station-map" class="station-map" role="region" aria-label="서울 분석 대상 역 지도"></div>
          <p class="map-note">좌표가 있는 ${stations.filter(hasCoordinates).length}개 역을 표시합니다. 좌표가 없는 역도 검색 목록에서 선택할 수 있습니다.</p>
          <p id="map-status" class="map-note" role="status"></p>
        </div>
        <article id="station-detail" class="detail-panel panel" aria-labelledby="station-title"></article>
      </div>
      <p id="selection-status" class="sr-only" role="status" aria-live="polite"></p>
    </section>
    <section class="industry-section" aria-labelledby="industry-title">
      <div class="section-heading"><div><p class="eyebrow">관심 업종에서 다시 보기</p><h2 id="industry-title">이 업종의 매출이 큰 역은?</h2></div><span class="section-index">03</span></div>
      <div class="industry-panel panel"><div class="industry-controls"><div><label for="industry-filter">관심 업종</label><select id="industry-filter">${summary.industries.map((name) => `<option value="${e(name)}">${e(name)}</option>`).join('')}</select></div><p>선택한 업종의 대표 상권 매출 합계순입니다.<br />점포당 매출이나 예상 수익 순위가 아닙니다.</p></div>
        <p id="industry-status" class="search-count" role="status" aria-live="polite"></p><ol id="industry-results" class="industry-results"></ol>
      </div>
    </section>
    ${provenance(meta, summary.n_stations)}
  </main>
  <footer class="site-footer"><span>서울 상권 탐색</span><p>공개 데이터로 읽는 서울의 상권 · 해석의 시작점을 제공합니다.</p><a href="#overview">맨 위로 ↑</a></footer>`;
}

export function renderSearchResults(stations: Station[], selectedId: string): string {
  if (!stations.length) return '<li class="empty-state">검색 결과가 없습니다. 다른 역 이름이나 노선을 입력해 주세요.</li>';
  return stations.map((station) => `<li><button class="station-option" data-station-id="${e(station.id)}" aria-pressed="${station.id === selectedId}"><span><strong>${e(station.name)}</strong><small>${e(station.line)}</small></span>${badge(station)}</button></li>`).join('');
}

export function renderDetail(station: Station, summary: SummaryData): string {
  const presentation = verdictPresentation(station.verdict);
  const industries = station.industries.slice(0, 6);
  return `<div class="detail-heading"><div><p class="eyebrow">선택한 역</p><h3 id="station-title" tabindex="-1" data-testid="station-title">${e(station.name)}</h3><p class="station-line">${e(station.line)} <span>· ${e(station.flow_type)}</span></p></div>${badge(station)}</div>
    <div class="rank-comparison"><div><p>유동인구 순위</p><strong data-testid="pass-rank">${station.pass_rank}<span>위</span></strong><small>일평균 ${formatPassengers(station.daily_passengers)}</small></div><span class="rank-connector" aria-hidden="true">→</span><div><p>매출 순위</p><strong data-testid="sales-rank">${station.sales_rank}<span>위</span></strong><small>${formatSales(station.sales_eok)}</small></div></div>
    <div class="verdict-box ${presentation.className}"><div><span>순위 격차</span><strong data-testid="station-gap">${formatGap(station.gap)}<small>단계</small></strong></div><p>${e(presentation.label)}</p></div>
    <p class="explanation" data-testid="station-explanation">${e(station.explanation)}</p>
    <dl class="detail-facts"><div><dt>대표 상권</dt><dd>${e(station.commercial_area)}</dd></div><div><dt>비교 범위</dt><dd>${summary.n_stations}개 역 · 판정 기준 ±${summary.verdict_threshold}단계</dd></div><div><dt>매출 기간</dt><dd>${e(summary.meta.commercial_period)}</dd></div></dl>
    ${!hasCoordinates(station) ? '<p class="coordinate-note">이 역은 좌표 자료가 없어 지도에 표시하지 않았습니다.</p>' : ''}
    <div class="chart-heading"><h4>어떤 업종에서 소비할까요?</h4><span>매출 상위 ${industries.length}개 · 억원</span></div>
    ${industries.length ? `<div class="chart-container"><canvas id="industry-chart" role="img" aria-label="${e(station.name)}의 업종별 매출 막대 차트. 수치는 아래 표에서 확인할 수 있습니다."></canvas></div><details class="chart-data"><summary>차트 수치 표로 보기</summary><table><caption>${e(station.name)} 대표 상권 업종별 매출 상위 ${industries.length}개</caption><thead><tr><th scope="col">업종</th><th scope="col">매출</th></tr></thead><tbody>${industries.map((industry) => `<tr><th scope="row">${e(industry.name)}</th><td>${formatSales(industry.sales_eok)}</td></tr>`).join('')}</tbody></table></details>` : '<p class="empty-state">이 역의 업종별 매출 자료가 없습니다.</p>'}
    <p class="detail-footnote">‘알짜·거품’은 유동인구와 매출의 상대 순위에 붙인 분석용 이름입니다.</p>`;
}
