// ./js/index.js (최종본)
'use strict';

let xpChart = null;

// Center label plugin for doughnut chart
const CenterTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const total = (chart.data.datasets?.[0]?.data || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.fillStyle = '#e8ecf3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 18px 'Noto Sans KR', system-ui";
    ctx.fillText('총 XP', cx, cy - 10);
    ctx.font = "800 22px 'Noto Sans KR', system-ui";
    ctx.fillStyle = '#5c94fc';
    ctx.fillText(String(total), cx, cy + 14);
    ctx.restore();
  }
};

// Register plugin globally if Chart.js is available
if (typeof Chart !== 'undefined' && Chart.register) {
  Chart.register(CenterTextPlugin);
}

function $(sel) { return document.querySelector(sel); }

function renderDashboard() {
  if (!window.DataManager) {
    console.warn('DataManager가 없습니다. 스크립트 로드 순서를 확인하세요.');
    return;
  }

  const s = DataManager.getState();

  // ------ 플레이어 헤더 ------
  const nameEl  = $('#user-name');
  const levelEl = $('#user-level');
  const xpText  = $('#user-xp-text');
  const xpBar   = $('#user-xp-bar');

  const playerXP = s?.player?.xp ?? 0;
  const xpToNext = s?.player?.xpToNextLevel ?? 10;

  if (nameEl)  nameEl.textContent  = s?.player?.name ?? 'Hero';
  if (levelEl) levelEl.textContent = `레벨 ${s?.player?.level ?? 1}`;
  if (xpText)  xpText.textContent  = `${playerXP} / ${xpToNext} XP`;
  if (xpBar)   xpBar.style.width   = `${Math.min(100, (playerXP / xpToNext) * 100)}%`;

  // ------ 뱃지 렌더 (state.badges 기준, 이미지 없으면 텍스트 fallback) ------
  const badgeContainer = $('#badge-container');
  if (badgeContainer) {
    badgeContainer.innerHTML = '';

    const badgesMap = s?.badges ?? {}; // { key: {title, earnedAt} }
    const keys = Object.keys(badgesMap);

    if (!keys.length) {
      badgeContainer.textContent = '아직 획득한 뱃지가 없습니다.';
    } else {
      const BADGE_EMOJI = {
        'first-bingo': '🏆',
        'bingo-blackout': '✨',
        'first-correct': '🥇',
        'reading-perfect': '📖',
        'combo-3': '⚡',
        'combo-5': '🔥'
      };

      keys.forEach((key) => {
        const div = document.createElement('div');
        div.className = 'badge';
        const title = badgesMap[key]?.title || key;
        div.title = title;

        const base = `./images/badge_${key}`;
        const candidates = [`${base}.png`, `${base}.svg`];
        let resolved = false;

        const tryNext = (i) => {
          if (i >= candidates.length) {
            // 이미지 파일 없으면 이모지+텍스트로 표시
            const emoji = BADGE_EMOJI[key] || '🏅';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.textAlign = 'center';
            div.style.padding = '8px';
            div.innerHTML = `<div style="font-size:34px; line-height:1">${emoji}</div>
                             <div style="font-size:12px; font-weight:700; margin-top:6px">${title}</div>`;
            return;
          }
          const img = new Image();
          img.onload = () => {
            if (resolved) return;
            resolved = true;
            div.style.backgroundImage = `url('${candidates[i]}')`;
            div.style.backgroundSize = 'cover';
            div.style.backgroundPosition = 'center';
          };
          img.onerror = () => tryNext(i + 1);
          img.src = candidates[i];
        };
        tryNext(0);

        badgeContainer.appendChild(div);
      });
    }
  }

  // ------ 차트 (문법/독해/빙고) ------
  const grammarXP = s?.grammarQuest?.xp ?? 0;
  const readingXP = s?.readingProgress?.xp ?? 0;
  const bingoXP   = s?.bingoProgress?.xp ?? 0;
  buildOrUpdateChart({ grammarXP, readingXP, bingoXP });
}

function buildOrUpdateChart({ grammarXP, readingXP, bingoXP }) {
  const canvas = document.getElementById('xp-chart');
  if (!canvas || !window.Chart) return;

  const data = {
    labels: ['문법 RPG', '독해 훈련', 'LC빙고'],
    datasets: [{
      data: [grammarXP, readingXP, bingoXP],
      backgroundColor: ['#FFD700', '#4A90E2', 'hsla(145,58%,55%,1)'],
      borderColor: '#3f4a8a',
      borderWidth: 4,
      hoverOffset: 4
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'white', font: { size: 14 } } }
    }
  };

  if (xpChart) {
    xpChart.data = data;
    // Apply visual tune-up and custom legend
    const LEGEND_LABELS = ['문법 RPG', '독해 훈련', 'LC 빙고'];
    const COLORS = ['#f6c33d', '#5b83f7', '#42d29d'];
    xpChart.data.labels = LEGEND_LABELS;
    const ds = xpChart.data.datasets[0];
    ds.backgroundColor = COLORS;
    ds.borderColor = 'rgba(10,12,18,0.9)';
    ds.borderWidth = 3;
    ds.hoverOffset = 6;
    if (!xpChart.options.plugins) xpChart.options.plugins = {};
    xpChart.options.plugins.legend = { display: false };
    xpChart.options.cutout = '62%';
    xpChart.update();
    renderLegend(xpChart);
  } else {
    const ctx = canvas.getContext('2d');
    xpChart = new Chart(ctx, { type: 'doughnut', data, options });
    // Apply visual tune-up and custom legend
    const LEGEND_LABELS = ['문법 RPG', '독해 훈련', 'LC 빙고'];
    const COLORS = ['#f6c33d', '#5b83f7', '#42d29d'];
    xpChart.data.labels = LEGEND_LABELS;
    const ds = xpChart.data.datasets[0];
    ds.backgroundColor = COLORS;
    ds.borderColor = 'rgba(10,12,18,0.9)';
    ds.borderWidth = 3;
    ds.hoverOffset = 6;
    if (!xpChart.options.plugins) xpChart.options.plugins = {};
    xpChart.options.plugins.legend = { display: false };
    xpChart.options.cutout = '62%';
    xpChart.update();
    renderLegend(xpChart);
  }
}

// Build clickable custom legend
function renderLegend(chart) {
  const el = document.getElementById('xp-legend');
  if (!el) return;
  const labels = chart.data.labels || [];
  const colors = chart.data.datasets?.[0]?.backgroundColor || [];
  const isHidden = (i) => chart.getDataVisibility ? !chart.getDataVisibility(i) : false;

  el.innerHTML = labels.map((label, i) => {
    const pressed = isHidden(i) ? ' aria-pressed="true"' : '';
    return `<li><button type="button" class=\"legend-item\" data-index=\"${i}\"${pressed}><span class=\"swatch\" style=\"background:${colors[i]}\"></span><span class=\"label\">${label}</span></button></li>`;
  }).join('');

  el.querySelectorAll('.legend-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.getAttribute('data-index'));
      chart.toggleDataVisibility(i);
      e.currentTarget.toggleAttribute('aria-pressed');
      chart.update();
    });
  });
}

function initIndex() {
  // 초기 렌더
  renderDashboard();

  // 같은 탭 내에서 DataManager가 변경을 브로드캐스트하면 재렌더
  if (window.DataManager?.subscribe) {
    DataManager.subscribe(() => renderDashboard());
  }

  // 다른 탭/페이지에서 localStorage가 바뀌면 재렌더
  window.addEventListener('storage', (e) => {
    if (e.key === 'linguaVerseUserData') renderDashboard();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Bootstrap carousel (있다면) 안전 초기화
  const el = document.querySelector('#carouselExampleIndicators');
  const hasBootstrap = !!(window.bootstrap && window.bootstrap.Carousel);
  if (el && hasBootstrap) {
    new bootstrap.Carousel(el, { interval: 2000, touch: false, ride: true });
  }

  // 카드 페이드업 (있다면)
  const cards = document.querySelectorAll('.card');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  cards.forEach((c) => io.observe(c));

  // 인덱스 초기화
  initIndex();
});
