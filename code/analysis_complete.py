#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
서울시 지하철 유동인구 × 상권 매출 분석
SCQA 기반 창업 입지 추천 프로젝트

[전체 코드]
- 데이터 로딩 → 전처리 → 통계분석 → 시각화
"""

import csv, json, re, os, zipfile, io
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.stats import ttest_ind, f_oneway, linregress, spearmanr
from adjustText import adjust_text

plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

# ================================================================
# 1. 데이터 로딩
# ================================================================
print("=" * 50)
print("1. 데이터 로딩")
print("=" * 50)

# 1-1. 지하철 CSV (utf-8-sig)
subway_path = 'CARD_SUBWAY_MONTH_202605.csv'
with open(subway_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    subway_rows = list(reader)
print(f"   지하철: {len(subway_rows)}건")

# 1-2. 상권 ZIP (cp949)
with zipfile.ZipFile('서울시_상권분석서비스_2025.zip', 'r') as z:
    with z.open(z.namelist()[0]) as f:
        text = f.read().decode('cp949')
all_rows = list(csv.DictReader(io.StringIO(text)))
print(f"   상권: {len(all_rows)}건")

# ================================================================
# 2. 역별 일평균 승객 수 계산
# ================================================================
print("=" * 50)
print("2. 역별 승객 집계")
print("=" * 50)

station_totals = {}
for row in subway_rows:
    name = row['역명']
    line = row['노선명']
    board = int(row['승차총승객수'])
    alight = int(row['하차총승객수'])
    if name not in station_totals:
        station_totals[name] = {'b': 0, 'a': 0, 'd': 0, 'l': line}
    station_totals[name]['b'] += board
    station_totals[name]['a'] += alight
    station_totals[name]['d'] += 1

# 역 유형 분류
stations = {}
for name, v in station_totals.items():
    avg_total = (v['b'] + v['a']) / v['d']
    ratio = v['a'] / (v['b'] + v['a'])
    if ratio > 0.505:
        typ = '도착형'
    elif ratio < 0.495:
        typ = '출발형'
    else:
        typ = '균형형'
    stations[name] = {'total': avg_total, 'line': v['l'], 'type': typ}

print(f"   전체 역: {len(stations)}개")
type_cnt = {'도착형': 0, '출발형': 0, '균형형': 0}
for s in stations.values():
    type_cnt[s['type']] += 1
print(f"   유형 분포: {type_cnt}")

# ================================================================
# 3. 역명-상권명 매칭 (정규표현식)
# ================================================================
print("=" * 50)
print("3. 역명-상권명 매칭")
print("=" * 50)

commercial_match = {}
for r in all_rows:
    m = re.match(r'^(.+?)역', r['상권_코드_명'])
    if m:
        cand = m.group(1).strip()
        for sname in stations:
            clean = re.sub(r'\([^)]*\)', '', sname).strip()
            if clean == cand:
                if sname not in commercial_match:
                    commercial_match[sname] = set()
                commercial_match[sname].add(r['상권_코드_명'])

print(f"   매칭 완료: {len(commercial_match)}개 역")

# ================================================================
# 4. 매출 연결 및 순위 분석
# ================================================================
print("=" * 50)
print("4. 순위 분석")
print("=" * 50)

def get_sales(sname):
    if sname not in commercial_match:
        return 0
    best = max(commercial_match[sname],
               key=lambda c: sum(int(r['당월_매출_금액'])
                                 for r in all_rows if r['상권_코드_명'] == c))
    total = sum(int(r['당월_매출_금액'])
                for r in all_rows if r['상권_코드_명'] == best)
    return total / 1e8  # 억원 단위

# 분석 데이터 구축
rank_data = []
for sname in commercial_match:
    sales = get_sales(sname)
    if sales > 0 and sname in stations:
        rank_data.append({
            'name': sname,
            'pass': stations[sname]['total'],
            'sales': sales,
            'line': stations[sname]['line'],
            'type': stations[sname]['type']
        })

# 유동인구 순위
rank_data.sort(key=lambda x: -x['pass'])
for i, d in enumerate(rank_data):
    d['pass_rank'] = i + 1

# 매출 순위
rank_data.sort(key=lambda x: -x['sales'])
for i, d in enumerate(rank_data):
    d['sales_rank'] = i + 1

# 순위 격차
for d in rank_data:
    d['gap'] = d['sales_rank'] - d['pass_rank']
    # 양수 = 승객순위보다 매출순위가 낮음
    # 음수 = 승객순위보다 매출순위가 높음

print(f"\n   유동인구 TOP 10 vs 매출 순위:")
print(f"   {'역명':12s} {'승객순위':8s} {'매출순위':8s} {'격차':8s}")
for d in sorted(rank_data, key=lambda x: x['pass_rank'])[:10]:
    sign = '+' if d['gap'] > 0 else ''
    print(f"   {d['name']:12s} {d['pass_rank']:3d}등      {d['sales_rank']:3d}등      {sign}{d['gap']}단계")

# ================================================================
# 5. 통계분석
# ================================================================
print("=" * 50)
print("5. 통계분석")
print("=" * 50)

# 5-1. Spearman 순위 상관
pass_ranks = [d['pass_rank'] for d in rank_data]
sales_ranks = [d['sales_rank'] for d in rank_data]
rho, p_sp = spearmanr(pass_ranks, sales_ranks)
print(f"\n   [Spearman] rho = {rho:.3f}, p = {p_sp:.4f}")

# 5-2. 회귀분석
x_all = np.array([d['pass'] / 10000 for d in rank_data])
y_all = np.array([d['sales'] for d in rank_data])
slope, intercept, rv, pv, _ = linregress(x_all, y_all)
print(f"\n   [Regression] R² = {rv**2:.3f}")
print(f"   y = {slope:.1f}x + ({intercept:.0f})")
print(f"   p = {pv:.6f}")

# 5-3. t-test / ANOVA
rank_data.sort(key=lambda x: x['sales_rank'])
n = len(rank_data)
for i, d in enumerate(rank_data):
    if i < n // 3:
        d['group'] = '상'
    elif i < n * 2 // 3:
        d['group'] = '중'
    else:
        d['group'] = '하'

g_high = [d['pass'] / 10000 for d in rank_data if d['group'] == '상']
g_mid = [d['pass'] / 10000 for d in rank_data if d['group'] == '중']
g_low = [d['pass'] / 10000 for d in rank_data if d['group'] == '하']

t_stat, p_tt = ttest_ind(g_high, g_low, equal_var=False)
f_stat, p_an = f_oneway(g_high, g_mid, g_low)
print(f"\n   [t-test] t = {t_stat:.3f}, p = {p_tt:.4f}")
print(f"   [ANOVA] F = {f_stat:.3f}, p = {p_an:.4f}")

# ================================================================
# 6. 시각화: 산점도
# ================================================================
print("=" * 50)
print("6. 시각화")
print("=" * 50)

fig, ax = plt.subplots(figsize=(14, 9), facecolor='white')
ax.set_facecolor('white')

# 전체 역 (회색)
mask = y_all <= 20000
ax.scatter(x_all[mask], y_all[mask],
           c='#CBD5E1', s=28, alpha=0.7, linewidth=0, zorder=1,
           label='전체 역 (n=239)')

# TOP10 (빨강)
x_top = np.array([d['pass'] / 10000 for d in rank_data[:10]])
y_top = np.minimum(np.array([d['sales'] for d in rank_data[:10]]), 20000)
names_top = [d['name'] for d in rank_data[:10]]
ax.scatter(x_top, y_top, c='#EF4444', s=90, alpha=0.9,
           linewidth=0.8, edgecolors='white', zorder=4,
           label='유동인구 TOP10 역')

# 회귀선
x_line = np.linspace(0, max(x_all) * 1.05, 100)
y_line = slope * x_line + intercept
y_line_c = np.clip(y_line, 0, 22000)
ax.plot(x_line, y_line_c, color='#0F2747', linewidth=3,
        zorder=3, label=f'회귀선 (R²={rv**2:.3f})')

# 95% 신뢰구간
xm = np.mean(x_all)
sxx = np.sum((x_all - xm) ** 2)
mse = np.sum((y_all - (slope * x_all + intercept)) ** 2) / (n - 2)
se = np.sqrt(mse * (1 / n + (x_line - xm) ** 2 / sxx))
ci = 1.96 * se
ax.fill_between(x_line, np.clip(y_line - ci, 0, 20000),
                np.clip(y_line + ci, 0, 20000),
                color='#0F2747', alpha=0.08, zorder=2)

# TOP10 라벨
texts = []
for x, y, name in zip(x_top, y_top, names_top):
    texts.append(ax.text(x, y, name, fontsize=10, fontweight='bold',
                         color='#1E293B',
                         bbox=dict(boxstyle='round,pad=0.25',
                                   facecolor='white', edgecolor='#EF4444',
                                   alpha=0.9, linewidth=0.8)))
adjust_text(texts, x_top, y_top,
            arrowprops=dict(arrowstyle='-', color='#EF4444', lw=0.8, alpha=0.6),
            force_text=(1.8, 1.8), force_points=(0.8, 0.8), expand=(2.0, 2.0))

# 회귀 결과 박스
box = (f'Regression Result\n'
       f'R² = {rv**2:.3f}\n'
       f'y = {slope:.1f}x + ({intercept:.0f})\n'
       f'p < 0.001\n'
       f'n = {n}')
ax.text(0.96, 0.96, box, transform=ax.transAxes, fontsize=9,
        va='top', ha='right', fontfamily='DejaVu Sans Mono',
        bbox=dict(boxstyle='round,pad=0.6', facecolor='white',
                  edgecolor='#0F2747', linewidth=1.2))

# 축 설정
ax.set_ylim(0, 20000)
ax.set_xlim(0, max(x_all) * 1.05)
ax.set_xlabel('유동인구 (만명/일)', fontsize=14, fontweight='bold', color='#0F2747')
ax.set_ylabel('추정 매출액 (억원)', fontsize=14, fontweight='bold', color='#0F2747')
ax.set_title('유동인구와 추정매출의 관계', fontsize=20, fontweight='bold', color='#0F2747')

# (0,0) 정렬
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_position(('data', 0))
ax.spines['bottom'].set_position(('data', 0))
ax.spines['left'].set_color('#0F2747')
ax.spines['bottom'].set_color('#0F2747')

ax.grid(True, alpha=0.12, color='#94A3B8', linewidth=0.5)
ax.set_axisbelow(True)
ax.tick_params(colors='#0F2747', labelsize=11)
ax.legend(loc='lower right', fontsize=10, framealpha=0.95,
          edgecolor='#E2E8F0', facecolor='white')

plt.tight_layout()
plt.savefig('scatter_final.png', dpi=300, bbox_inches='tight', facecolor='white')
plt.close()
print("   ✅ scatter_final.png 저장 완료")

print("=" * 50)
print("✅ 전체 분석 완료!")
print("=" * 50)
print(f"\n📍 핵심 결과")
print(f"   Spearman ρ = {rho:.3f}")
print(f"   R² = {rv**2:.3f}")
print(f"   t-test p = {p_tt:.4f}")
print(f"   ANOVA p = {p_an:.4f}")
