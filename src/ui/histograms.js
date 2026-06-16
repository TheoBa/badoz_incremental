// histograms.js — 7-bar proportional histogram renderer
// Used in the KPI dashboard for satisfaction, retention, and marketing stream.

/**
 * Renders 7 proportional bars into a container element.
 * @param {HTMLElement} container
 * @param {number[]} values   - array of 7 values, oldest first, newest last
 * @param {string} color      - CSS color for the most recent bar
 */
export function renderHistogram(container, values, color) {
  const max = Math.max(...values, 1);
  container.innerHTML = values
    .map((v, i) => {
      const height = Math.max(2, Math.round((v / max) * 22));
      const opacity = 0.25 + i * 0.11; // older bars are more transparent
      const barColor = i === 6 ? color : '#aaa';
      return `<div class="hb" style="height:${height}px;background:${barColor};opacity:${opacity}"></div>`;
    })
    .join('');
}
