// frontier_lab.js — stub (not yet implemented)
export function renderFrontierLab(state) {
  const panel = document.getElementById('panel-frontier_lab');
  if (!panel._built) {
    panel.innerHTML = '<p style="color:var(--text2);padding:20px;font-size:12px">frontier_lab — coming soon</p>';
    panel._built = true;
  }
}
