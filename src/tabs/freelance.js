// freelance.js — stub (not yet implemented)
export function renderFreelance(state) {
  const panel = document.getElementById('panel-freelance');
  if (!panel._built) {
    panel.innerHTML = '<p style="color:var(--text2);padding:20px;font-size:12px">freelance — coming soon</p>';
    panel._built = true;
  }
}
