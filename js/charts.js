/* Chart.js wrapper: category doughnut and daily spend bar chart. */
(function (global) {
  'use strict';

  const { CATEGORIES, formatINR, formatDate } = global.Utils;
  let chart = null;
  let mode = 'category';

  const available = () => typeof global.Chart !== 'undefined';

  const baseOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, font: { family: 'Poppins', size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.parsed.y ?? ctx.parsed)}` } },
    },
  });

  const categoryConfig = (expenses) => {
    const totals = CATEGORIES.map((c) => expenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0));
    const used = CATEGORIES.map((c, i) => ({ ...c, total: totals[i] })).filter((c) => c.total > 0);
    return {
      type: 'doughnut',
      data: {
        labels: used.map((c) => c.id),
        datasets: [{ data: used.map((c) => c.total), backgroundColor: used.map((c) => c.color), borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }],
      },
      options: { ...baseOptions(), cutout: '62%' },
    };
  };

  const dailyConfig = (expenses) => {
    const byDay = {};
    expenses.forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
    const days = Object.keys(byDay).sort();
    const opts = baseOptions();
    opts.plugins.legend.display = false;
    opts.scales = {
      x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#e7efe9' }, ticks: { font: { family: 'Poppins', size: 11 }, callback: (v) => formatINR(v) } },
    };
    return {
      type: 'bar',
      data: {
        labels: days.map((d) => formatDate(d).replace(/ \d{4}$/, '')),
        datasets: [{ label: 'Spent', data: days.map((d) => byDay[d]), backgroundColor: '#1f7a4d', borderRadius: 8, maxBarThickness: 42 }],
      },
      options: opts,
    };
  };

  const render = (canvas, expenses) => {
    if (!available()) return false;
    const config = mode === 'daily' ? dailyConfig(expenses) : categoryConfig(expenses);
    if (chart && chart.config.type === config.type) {
      chart.data = config.data;
      chart.options = config.options;
      chart.update();
    } else {
      if (chart) chart.destroy();
      chart = new global.Chart(canvas, config);
    }
    return true;
  };

  const setMode = (next) => { mode = next; };

  global.Charts = { render, setMode, available };
})(window);
