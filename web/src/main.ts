import './style.css';
import { drawIndustryChart } from './chart';
import { filterStations, recommendByIndustry } from './lib/data';
import { escapeHtml as e, formatSales } from './lib/format';
import { loadData } from './lib/load';
import type { Station } from './lib/types';
import { createStationMap } from './map';
import { badge, renderDetail, renderSearchResults, renderShell } from './views';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`필수 화면 요소가 없습니다: ${selector}`);
  return found;
}

async function start() {
  const app = element<HTMLDivElement>('#app');
  try {
    const { stationsData, summary } = await loadData();
    const { stations } = stationsData;
    app.innerHTML = renderShell(stations, summary);
    app.setAttribute('aria-busy', 'false');
    const lookup = new Map(stations.map((station) => [station.id, station]));
    let selected = lookup.get(summary.top_gems[0]?.id) ?? stations[0];
    const search = element<HTMLInputElement>('#station-search');
    const results = element<HTMLUListElement>('#station-results');
    const detail = element<HTMLElement>('#station-detail');
    const industry = element<HTMLSelectElement>('#industry-filter');
    let chart: ReturnType<typeof drawIndustryChart> | undefined;
    let map: ReturnType<typeof createStationMap> | undefined;

    function updateSearch() {
      const matches = filterStations(stations, search.value);
      results.innerHTML = renderSearchResults(matches, selected.id);
      element('#search-count').textContent = `${matches.length}개 역 · Tab 키로 이동하거나 Enter 키로 첫 결과를 선택하세요.`;
      element<HTMLButtonElement>('#clear-search').disabled = !search.value;
    }

    function updateDetail() {
      chart?.destroy();
      chart = undefined;
      detail.innerHTML = renderDetail(selected, summary);
      const canvas = detail.querySelector<HTMLCanvasElement>('#industry-chart');
      if (canvas) chart = drawIndustryChart(canvas, selected.industries.slice(0, 6));
    }

    function selectStation(station: Station, focus = true) {
      selected = station;
      updateDetail();
      for (const button of results.querySelectorAll<HTMLButtonElement>('button[data-station-id]')) {
        button.setAttribute('aria-pressed', String(button.dataset.stationId === selected.id));
      }
      map?.select(station, focus);
      element('#selection-status').textContent = `${station.name} 선택됨. 유동인구 ${station.pass_rank}위, 매출 ${station.sales_rank}위, ${station.verdict}.`;
      if (focus) {
        element('#station-title').focus({ preventScroll: true });
        if (window.innerWidth < 900) detail.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }

    function updateRecommendations() {
      const recommendations = recommendByIndustry(stations, industry.value);
      element('#industry-status').textContent = industry.value ? `${industry.value} · 매출이 확인된 상위 ${recommendations.length}개 역` : '선택할 수 있는 업종이 없습니다.';
      element('#industry-results').innerHTML = recommendations.length
        ? recommendations.map(({ station, sales_eok }, index) => `<li><button class="industry-station" data-station-id="${e(station.id)}" aria-label="${e(station.name)} 역 상세 보기"><span class="list-number">${String(index + 1).padStart(2, '0')}</span><span class="industry-name"><strong>${e(station.name)}</strong><small>${e(station.commercial_area)}</small></span><span class="industry-sales">${formatSales(sales_eok)}</span>${badge(station)}</button></li>`).join('')
        : '<li class="empty-state">이 업종의 매출 자료가 있는 역이 없습니다.</li>';
    }

    search.addEventListener('input', updateSearch);
    element('#clear-search').addEventListener('click', () => { search.value = ''; updateSearch(); search.focus(); });
    element('.search-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const first = filterStations(stations, search.value)[0];
      if (first) selectStation(first);
    });
    industry.addEventListener('change', updateRecommendations);
    app.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button[data-station-id]');
      const station = button?.dataset.stationId ? lookup.get(button.dataset.stationId) : undefined;
      if (station) selectStation(station);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDetail);
    updateSearch();
    updateRecommendations();
    updateDetail();
    map = createStationMap(stations, selectStation);
    map.select(selected, false);
  } catch (error) {
    app.setAttribute('aria-busy', 'false');
    app.innerHTML = `<main class="loading-state" role="alert"><span class="brand-mark" aria-hidden="true">서</span><h1>분석 데이터를 불러오지 못했습니다</h1><p>${e(error instanceof Error ? error.message : '네트워크 연결을 확인해 주세요.')}</p><button class="primary-button" id="retry-load">다시 불러오기</button></main>`;
    element('#retry-load').addEventListener('click', () => window.location.reload());
  }
}

void start();
