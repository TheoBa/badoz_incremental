// render.js — top-level DOM renderer
// Reads state and updates the UI. Pure function: no side effects on state.

import { renderWriteCode }   from '../tabs/write_code.js';
import { renderShipFeature } from '../tabs/ship_feature.js';
import { renderFreelance }   from '../tabs/freelance.js';
import { renderInvestment }  from '../tabs/investment.js';
import { renderFrontierLab } from '../tabs/frontier_lab.js';
import { renderPostOnX }     from '../tabs/post_on_x.js';

export function render(state) {
  updateHeader(state);
  updateKpiDashboard(state);

  const activeTab = document.querySelector('.tb.on')?.dataset.tab ?? 'write_code';
  switch (activeTab) {
    case 'write_code':   renderWriteCode(state);   break;
    case 'ship_feature': renderShipFeature(state); break;
    case 'freelance':    renderFreelance(state);   break;
    case 'investment':   renderInvestment(state);  break;
    case 'frontier_lab': renderFrontierLab(state); break;
    case 'post_on_x':    renderPostOnX(state);     break;
  }
}

function updateHeader(state) {
  // TODO: update timer, wallet, RCU, RCU/h, MB/h display
}

function updateKpiDashboard(state) {
  // TODO: update all KPI values and histogram bars
}
