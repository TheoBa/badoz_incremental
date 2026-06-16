// investment.js — stub (not yet implemented)
export function renderInvestment(state) {
  const panel = document.getElementById('panel-investment');
  if (!panel._built) {
    panel.innerHTML = '<p style="color:var(--text2);padding:20px;font-size:12px">investment — coming soon</p>';
    panel._built = true;
  }
}
