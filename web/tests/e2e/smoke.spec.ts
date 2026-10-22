import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { hasCoordinates, recommendByIndustry } from '../../src/lib/data';
import { formatGap } from '../../src/lib/format';
import { parseData } from '../../src/lib/load';

// Fail if the committed real data is missing; never fall back to a fixture here.
const { stationsData, summary } = parseData(
  JSON.parse(readFileSync(new URL('../../public/data/stations.json', import.meta.url), 'utf8')),
  JSON.parse(readFileSync(new URL('../../public/data/summary.json', import.meta.url), 'utf8')),
);

test('실제 데이터로 역 검색·상세·업종 추천을 탐색한다', async ({ page, request }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let tileRequests = 0;
  // Only third-party map images are stubbed. App JS, JSON and all console errors remain real.
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    tileRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XwX1WQAAAABJRU5ErkJggg==', 'base64'),
    });
  });
  const dataResponse = page.waitForResponse((response) => response.url().endsWith('/data/stations.json'));
  const summaryResponse = page.waitForResponse((response) => response.url().endsWith('/data/summary.json'));
  await page.goto('./');
  expect((await dataResponse).ok()).toBe(true);
  expect(await (await dataResponse).json()).toEqual(stationsData);
  expect(await (await summaryResponse).json()).toEqual(summary);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('유동인구≠매출');
  await expect(page.getByTestId('r2')).toHaveText(summary.regression.r2.toFixed(3));
  await expect(page.getByTestId('rho')).toHaveText(summary.spearman.rho.toFixed(3));
  await expect(page.locator('#station-map .station-marker')).toHaveCount(stationsData.stations.filter(hasCoordinates).length);

  const station = stationsData.stations[0];
  const search = page.getByLabel('역 이름·노선·상권 검색');
  await search.fill(station.name);
  await search.press('Enter');
  await expect(page.getByTestId('station-title')).toHaveText(station.name);
  await expect(page.getByTestId('pass-rank')).toHaveText(`${station.pass_rank}위`);
  await expect(page.getByTestId('sales-rank')).toHaveText(`${station.sales_rank}위`);
  await expect(page.getByTestId('station-gap')).toHaveText(`${formatGap(station.gap)}단계`);
  await expect(page.getByTestId('station-explanation')).toHaveText(station.explanation);
  await expect(page.locator('#station-detail .badge')).toHaveText(station.verdict);
  await expect(page.locator('#industry-chart')).toBeVisible();
  await page.getByText('차트 수치 표로 보기', { exact: true }).click();
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(Math.min(6, station.industries.length));

  const coordinateMissing = stationsData.stations.find((item) => !hasCoordinates(item));
  if (coordinateMissing) {
    await search.fill(coordinateMissing.name);
    await search.press('Enter');
    await expect(page.getByTestId('station-title')).toHaveText(coordinateMissing.name);
    await expect(page.locator('.coordinate-note')).toBeVisible();
  }

  await search.fill('존재하지않는역_테스트');
  await expect(page.locator('#station-results')).toContainText('검색 결과가 없습니다');
  await page.getByRole('button', { name: '검색어 지우기' }).click();
  await expect(page.locator('#station-results button')).toHaveCount(stationsData.stations.length);

  const industry = summary.industries.find((name) => recommendByIndustry(stationsData.stations, name).length > 1)!;
  const recommended = recommendByIndustry(stationsData.stations, industry);
  await page.getByLabel('관심 업종', { exact: true }).selectOption(industry);
  const recommendations = page.locator('#industry-results button');
  await expect(recommendations).toHaveCount(recommended.length);
  await expect(recommendations.first()).toHaveAttribute('data-station-id', recommended[0].station.id);
  await recommendations.first().click();
  await expect(page.getByTestId('station-title')).toHaveText(recommended[0].station.name);

  const mapStation = stationsData.stations.find(hasCoordinates)!;
  await search.fill(mapStation.name);
  await search.press('Enter');
  const marker = page.locator('.station-marker.is-selected');
  await marker.scrollIntoViewIfNeeded();
  await marker.click();
  await expect(page.getByTestId('station-title')).toHaveText(mapStation.name);

  const versionResponse = await request.get('version.json');
  expect(versionResponse.ok()).toBe(true);
  const version = await versionResponse.json();
  expect(version.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(Number.isNaN(Date.parse(version.built_at))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}.png`), fullPage: true, animations: 'disabled' });
  expect(tileRequests).toBeGreaterThan(0);
  expect(consoleErrors, '브라우저 console.error').toEqual([]);
  expect(pageErrors, '브라우저 미처리 예외').toEqual([]);
  await testInfo.attach('검증-근거', {
    body: JSON.stringify({
      project: testInfo.project.name, viewport: page.viewportSize(), stationCount: stationsData.stations.length,
      generatedAt: summary.meta.generated_at, consoleErrors, pageErrors, tileRequests,
      mapTiles: 'OSM 타일 이미지만 테스트용 응답으로 대체', version,
    }, null, 2),
    contentType: 'application/json',
  });
});
