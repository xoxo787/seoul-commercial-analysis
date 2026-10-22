import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import type { Industry } from './lib/types';
import { formatSales } from './lib/format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export function drawIndustryChart(canvas: HTMLCanvasElement, industries: Industry[]) {
  const style = getComputedStyle(document.documentElement);
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: industries.map((industry) => industry.name),
      datasets: [{
        label: '매출',
        data: industries.map((industry) => industry.sales_eok),
        backgroundColor: industries.map((_, index) => index === 0 ? style.getPropertyValue('--accent').trim() : style.getPropertyValue('--chart-secondary').trim()),
        borderRadius: 4,
        barThickness: 16,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { tooltip: { callbacks: { label: (context) => formatSales(Number(context.raw)) } } },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: style.getPropertyValue('--border').trim() },
          ticks: { maxTicksLimit: 4, color: style.getPropertyValue('--muted').trim(), font: { size: 11 } },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: style.getPropertyValue('--text').trim(), font: { family: style.fontFamily, size: 12 }, autoSkip: false },
        },
      },
    },
  });
}
