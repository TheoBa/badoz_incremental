// post_on_x.js — stub (not yet implemented)
export function renderPostOnX(state) {
  const panel = document.getElementById('panel-post_on_x');
  if (!panel._built) {
    panel.innerHTML = '<p style="color:var(--text2);padding:20px;font-size:12px">post_on_x — coming soon</p>';
    panel._built = true;
  }
}
