// histograms.js — 7-bar proportional histogram renderer

/**
 * Renders 7 proportional bars into a container element.
 * @param {HTMLElement} container
 * @param {number[]} values  - array of 7 values, oldest [0] → newest [6]
 * @param {string}   color   - CSS color for the most recent (rightmost) bar
 */
export function renderHistogram(container, values, color) {
  if (!container) return;
  const max = Math.max(...values, 1);
  container.innerHTML = values.map((v, i) => {
    const height  = Math.max(2, Math.round((v / max) * 22));
    const opacity = 0.25 + i * 0.11;
    const bg      = i === 6 ? color : '#aaa';
    return `<div class="hist-bar" style="height:${height}px;background:${bg};opacity:${opacity}"></div>`;
  }).join('');
}
