// ship_feature.js — stub (not yet implemented)
export function renderShipFeature(state) {
  const panel = document.getElementById('panel-ship_feature');
  if (!panel._built) {
    panel.innerHTML = '<p style="color:var(--text2);padding:20px;font-size:12px">ship_feature — coming soon</p>';
    panel._built = true;
  }
}
