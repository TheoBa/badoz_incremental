// dev-analysis.js — developer analysis panel for game balancing

import { CONSTANTS, MILESTONES, FREELANCE, SAAS, LAB, INVESTMENTS } from '../engine/state.js';

const ROOTS    = { CONSTANTS, MILESTONES, FREELANCE, SAAS, LAB, INVESTMENTS };
const DEFAULTS = JSON.parse(JSON.stringify(ROOTS));

// ── Field groups ────────────────────────────────────────────────
const GROUPS = [
  {
    id: 'core', label: 'core',
    fields: [
      { path: 'CONSTANTS.TICK_RATE',            label: 'tick_rate',      step: 0.1 },
      { path: 'CONSTANTS.WIN_CONDITION',         label: 'win_condition',  step: 1e7 },
      { path: 'CONSTANTS.PostOnX_Rep_Delta',     label: 'post_rep_delta', step: 0.001 },
      { path: 'CONSTANTS.PostOnX_Cooldown',      label: 'post_cooldown',  step: 1 },
    ]
  },
  {
    id: 'milestones', label: 'milestones',
    fields: [
      { path: 'MILESTONES.money_tiers.t1',       label: 'money.t1',     step: 10 },
      { path: 'MILESTONES.money_tiers.t2',       label: 'money.t2',     step: 1e4 },
      { path: 'MILESTONES.money_tiers.t3',       label: 'money.t3',     step: 1e6 },
      { path: 'MILESTONES.freelance_tiers.t0',   label: 'fl.t0',        step: 1 },
      { path: 'MILESTONES.freelance_tiers.t1',   label: 'fl.t1',        step: 1 },
      { path: 'MILESTONES.freelance_tiers.t2',   label: 'fl.t2',        step: 5 },
      { path: 'MILESTONES.freelance_tiers.t3',   label: 'fl.t3',        step: 50 },
      { path: 'MILESTONES.rcu_tiers.t1',         label: 'rcu.t1',       step: 100 },
      { path: 'MILESTONES.rcu_tiers.t2',         label: 'rcu.t2',       step: 1000 },
      { path: 'MILESTONES.rcu_tiers.t3',         label: 'rcu.t3',       step: 1e4 },
      { path: 'MILESTONES.lab_spend_tiers.t1',   label: 'lab_burn.t1',  step: 10 },
      { path: 'MILESTONES.lab_spend_tiers.t2',   label: 'lab_burn.t2',  step: 100 },
      { path: 'MILESTONES.lab_spend_tiers.t3',   label: 'lab_burn.t3',  step: 1000 },
      { path: 'MILESTONES.lab_spend_tiers.t4',   label: 'lab_burn.t4',  step: 5000 },
      { path: 'MILESTONES.lab_spend_tiers.t5',   label: 'lab_burn.t5',  step: 1e4 },
      { path: 'MILESTONES.mrr_peak_tiers.t1',    label: 'mrr.t1',       step: 10 },
      { path: 'MILESTONES.mrr_peak_tiers.t2',    label: 'mrr.t2',       step: 1000 },
      { path: 'MILESTONES.mrr_peak_tiers.t3',    label: 'mrr.t3',       step: 1e4 },
      { path: 'MILESTONES.mrr_peak_tiers.t4',    label: 'mrr.t4',       step: 1e6 },
    ]
  },
  {
    id: 'saas', label: 'saas',
    fields: [
      { path: 'SAAS.subscription_price.t1',               label: 'price.t1',       step: 1 },
      { path: 'SAAS.subscription_price.t2',               label: 'price.t2',       step: 10 },
      { path: 'SAAS.subscription_price.t3',               label: 'price.t3',       step: 100 },
      { path: 'SAAS.demand_shock.t2.conversion',          label: 'shock.t2.conv',  step: 1 },
      { path: 'SAAS.demand_shock.t2.retention',           label: 'shock.t2.ret',   step: 1 },
      { path: 'SAAS.demand_shock.t3.conversion',          label: 'shock.t3.conv',  step: 1 },
      { path: 'SAAS.demand_shock.t3.retention',           label: 'shock.t3.ret',   step: 1 },
      { path: 'SAAS.ship_feature.conversion.base_cost',   label: 'conv.base_cost', step: 1 },
      { path: 'SAAS.ship_feature.conversion.cost_scale',  label: 'conv.cost_x',   step: 0.01 },
      { path: 'SAAS.ship_feature.conversion.base_delta',  label: 'conv.base_d',   step: 0.01 },
      { path: 'SAAS.ship_feature.conversion.delta_scale', label: 'conv.d_x',      step: 0.01 },
      { path: 'SAAS.ship_feature.retention.base_cost',    label: 'ret.base_cost',  step: 1 },
      { path: 'SAAS.ship_feature.retention.cost_scale',   label: 'ret.cost_x',    step: 0.01 },
      { path: 'SAAS.ship_feature.retention.base_delta',   label: 'ret.base_d',    step: 0.01 },
      { path: 'SAAS.ship_feature.retention.delta_scale',  label: 'ret.d_x',       step: 0.01 },
      { path: 'SAAS.ship_feature.marketing.base_cost',    label: 'mkt.base_cost',  step: 1 },
      { path: 'SAAS.ship_feature.marketing.cost_scale',   label: 'mkt.cost_x',    step: 0.01 },
      { path: 'SAAS.ship_feature.marketing.base_delta',   label: 'mkt.base_d',    step: 1 },
      { path: 'SAAS.ship_feature.marketing.delta_scale',  label: 'mkt.d_x',       step: 0.01 },
    ]
  },
  {
    id: 'freelance', label: 'freelance',
    fields: [
      { path: 'FREELANCE.rcu_cost.t1',           label: 'rcu_cost.jr',   step: 1 },
      { path: 'FREELANCE.rcu_cost.t2',           label: 'rcu_cost.sr',   step: 1 },
      { path: 'FREELANCE.rcu_cost.t3',           label: 'rcu_cost.lead', step: 5 },
      { path: 'FREELANCE.rcu_cost.t4',           label: 'rcu_cost.10x',  step: 50 },
      { path: 'FREELANCE.rcu_to_money_mult.t1',  label: 'mult.jr',       step: 0.5 },
      { path: 'FREELANCE.rcu_to_money_mult.t2',  label: 'mult.sr',       step: 0.5 },
      { path: 'FREELANCE.rcu_to_money_mult.t3',  label: 'mult.lead',     step: 0.5 },
      { path: 'FREELANCE.rcu_to_money_mult.t4',  label: 'mult.10x',      step: 0.5 },
      { path: 'FREELANCE.rcu_stdev',             label: 'rcu_stdev',     step: 0.05 },
    ]
  },
  {
    id: 'lab_plans', label: 'lab_plans',
    fields: [
      { path: 'LAB.plans.free.dailyCost',       label: 'free.cost/d',     step: 1 },
      { path: 'LAB.plans.free.multiplier',      label: 'free.mult',       step: 0.1 },
      { path: 'LAB.plans.hobbyist.dailyCost',   label: 'hobbyist.cost/d', step: 1 },
      { path: 'LAB.plans.hobbyist.multiplier',  label: 'hobbyist.mult',   step: 0.1 },
      { path: 'LAB.plans.growth.dailyCost',     label: 'growth.cost/d',   step: 5 },
      { path: 'LAB.plans.growth.multiplier',    label: 'growth.mult',     step: 0.5 },
      { path: 'LAB.plans.scale.dailyCost',      label: 'scale.cost/d',    step: 10 },
      { path: 'LAB.plans.scale.multiplier',     label: 'scale.mult',      step: 1 },
      { path: 'LAB.plans.infernal.dailyCost',   label: 'infernal.cost/d', step: 100 },
      { path: 'LAB.plans.infernal.multiplier',  label: 'infernal.mult',   step: 5 },
    ]
  },
  {
    id: 'lab_coder', label: 'agent / ai_coder',
    fields: [
      { path: 'LAB.agents.coder.minor_base_cost',  label: 'minor_base_cost',  step: 1 },
      { path: 'LAB.agents.coder.minor_cost_scale', label: 'minor_cost_scale', step: 0.01 },
      { path: 'LAB.agents.coder.base_delta',       label: 'base_delta',       step: 0.1 },
      { path: 'LAB.agents.coder.delta_scale',      label: 'delta_scale',      step: 0.01 },
      { path: 'LAB.agents.coder.major_base_cost',  label: 'major_base_cost',  step: 50 },
      { path: 'LAB.agents.coder.major_cost_scale', label: 'major_cost_scale', step: 0.1 },
      { path: 'LAB.agents.coder.major_pow',        label: 'major_pow',        step: 0.5 },
    ]
  },
  {
    id: 'lab_support', label: 'agent / ai_support',
    fields: [
      { path: 'LAB.agents.support.minor_base_cost',  label: 'minor_base_cost',  step: 10 },
      { path: 'LAB.agents.support.minor_cost_scale', label: 'minor_cost_scale', step: 0.01 },
      { path: 'LAB.agents.support.base_delta',       label: 'base_delta',       step: 0.1 },
      { path: 'LAB.agents.support.delta_scale',      label: 'delta_scale',      step: 0.01 },
      { path: 'LAB.agents.support.major_base_cost',  label: 'major_base_cost',  step: 200 },
      { path: 'LAB.agents.support.major_cost_scale', label: 'major_cost_scale', step: 0.1 },
      { path: 'LAB.agents.support.major_pow',        label: 'major_pow',        step: 0.5 },
    ]
  },
  {
    id: 'lab_marketer', label: 'agent / ai_marketer',
    fields: [
      { path: 'LAB.agents.marketer.minor_base_cost',  label: 'minor_base_cost',  step: 100 },
      { path: 'LAB.agents.marketer.minor_cost_scale', label: 'minor_cost_scale', step: 0.01 },
      { path: 'LAB.agents.marketer.base_delta',       label: 'base_delta',       step: 0.5 },
      { path: 'LAB.agents.marketer.delta_scale',      label: 'delta_scale',      step: 0.01 },
      { path: 'LAB.agents.marketer.major_base_cost',  label: 'major_base_cost',  step: 1000 },
      { path: 'LAB.agents.marketer.major_cost_scale', label: 'major_cost_scale', step: 0.1 },
      { path: 'LAB.agents.marketer.major_pow',        label: 'major_pow',        step: 0.5 },
    ]
  },
  {
    id: 'lab_pm', label: 'agent / ai_pm',
    fields: [
      { path: 'LAB.agents.product_manager.minor_base_cost',  label: 'minor_base_cost',  step: 500 },
      { path: 'LAB.agents.product_manager.minor_cost_scale', label: 'minor_cost_scale', step: 0.01 },
      { path: 'LAB.agents.product_manager.base_delta',       label: 'base_delta',       step: 0.01 },
      { path: 'LAB.agents.product_manager.delta_scale',      label: 'delta_scale',      step: 0.01 },
      { path: 'LAB.agents.product_manager.major_base_cost',  label: 'major_base_cost',  step: 5000 },
      { path: 'LAB.agents.product_manager.major_cost_scale', label: 'major_cost_scale', step: 0.1 },
      { path: 'LAB.agents.product_manager.major_pow',        label: 'major_pow',        step: 0.5 },
    ]
  },
  {
    id: 'lab_ceo', label: 'agent / ai_ceo',
    fields: [
      { path: 'LAB.agents.ceo.minor_base_cost',  label: 'minor_base_cost',  step: 10000 },
      { path: 'LAB.agents.ceo.minor_cost_scale', label: 'minor_cost_scale', step: 0.01 },
      { path: 'LAB.agents.ceo.base_delta',       label: 'base_delta',       step: 0.001 },
      { path: 'LAB.agents.ceo.delta_scale',      label: 'delta_scale',      step: 0.01 },
      { path: 'LAB.agents.ceo.major_base_cost',  label: 'major_base_cost',  step: 50000 },
      { path: 'LAB.agents.ceo.major_cost_scale', label: 'major_cost_scale', step: 0.1 },
      { path: 'LAB.agents.ceo.major_pow',        label: 'major_pow',        step: 0.5 },
    ]
  },
  {
    id: 'investments', label: 'investments',
    fields: [
      { path: 'INVESTMENTS.marketing.cold_outreach_campaign.cost',            label: 'cold.cost',       step: 10 },
      { path: 'INVESTMENTS.marketing.cold_outreach_campaign.boost',           label: 'cold.boost',      step: 5 },
      { path: 'INVESTMENTS.marketing.cold_outreach_campaign.campaign_active', label: 'cold.duration',   step: 1 },
      { path: 'INVESTMENTS.marketing.seo_push.cost',                          label: 'seo.cost',        step: 100 },
      { path: 'INVESTMENTS.marketing.seo_push.boost',                         label: 'seo.boost',       step: 5 },
      { path: 'INVESTMENTS.marketing.seo_push.campaign_active',               label: 'seo.duration',    step: 24 },
      { path: 'INVESTMENTS.reputation.newsletter.cost',                       label: 'nl.cost',         step: 25 },
      { path: 'INVESTMENTS.reputation.newsletter.boost',                      label: 'nl.boost',        step: 0.005 },
      { path: 'INVESTMENTS.reputation.newsletter.cooldown',                   label: 'nl.cooldown',     step: 1 },
      { path: 'INVESTMENTS.reputation.press_coverage.cost',                   label: 'press.cost',      step: 25 },
      { path: 'INVESTMENTS.reputation.press_coverage.boost',                  label: 'press.boost',     step: 0.01 },
      { path: 'INVESTMENTS.reputation.press_coverage.max_uses',               label: 'press.max_uses',  step: 1 },
      { path: 'INVESTMENTS.reputation.product_hunt.cost',                     label: 'ph.cost',         step: 1000 },
      { path: 'INVESTMENTS.reputation.product_hunt.boost',                    label: 'ph.boost',        step: 0.1 },
      { path: 'INVESTMENTS.rcu.cpu.base_cost',                                label: 'cpu.base_cost',   step: 100 },
      { path: 'INVESTMENTS.rcu.cpu.cost_scale',                               label: 'cpu.cost_scale',  step: 0.01 },
      { path: 'INVESTMENTS.rcu.cpu.delta',                                    label: 'cpu.delta',       step: 0.05 },
      { path: 'INVESTMENTS.rcu.gpu.base_cost',                                label: 'gpu.base_cost',   step: 100 },
      { path: 'INVESTMENTS.rcu.gpu.cost_scale',                               label: 'gpu.cost_scale',  step: 0.01 },
      { path: 'INVESTMENTS.rcu.gpu.delta',                                    label: 'gpu.delta',       step: 0.05 },
    ]
  },
];

const SYSTEMS = [
  { value: 'sf/conversion',  label: 'ship_feature / conversion' },
  { value: 'sf/retention',   label: 'ship_feature / retention'  },
  { value: 'sf/marketing',   label: 'ship_feature / marketing'  },
  { value: 'agent/coder',    label: 'agent / ai_coder'           },
  { value: 'agent/support',  label: 'agent / ai_support'         },
  { value: 'agent/marketer', label: 'agent / ai_marketer'        },
  { value: 'agent/pm',       label: 'agent / ai_pm'              },
  { value: 'agent/ceo',      label: 'agent / ai_ceo'             },
  { value: 'hw/cpu',         label: 'hardware / cpu'             },
  { value: 'hw/gpu',         label: 'hardware / gpu'             },
];

// ── Path helpers ────────────────────────────────────────────────
function resolveValue(path) {
  const parts = path.split('.');
  let obj = ROOTS[parts[0]];
  for (let i = 1; i < parts.length; i++) obj = obj[parts[i]];
  return obj;
}

function resolveDefault(path) {
  const parts = path.split('.');
  let obj = DEFAULTS[parts[0]];
  for (let i = 1; i < parts.length; i++) obj = obj[parts[i]];
  return obj;
}

function updateValue(path, val) {
  const parts = path.split('.');
  let obj = ROOTS[parts[0]];
  for (let i = 1; i < parts.length - 1; i++) obj = obj[parts[i]];
  obj[parts[parts.length - 1]] = val;
}

function resetGroup(groupId) {
  const group = GROUPS.find(g => g.id === groupId);
  if (!group) return;
  for (const field of group.fields) updateValue(field.path, resolveDefault(field.path));
}

// ── Curve computation ───────────────────────────────────────────
function computeCurves(systemVal, N) {
  if (systemVal.startsWith('sf/')) {
    const track = systemVal.slice(3);
    const cfg = SAAS.ship_feature[track];
    const margCost = [], cumCost = [], margGain = [], cumGain = [];
    let cc = 0, cg = 0;
    for (let i = 0; i < N; i++) {
      const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_scale, i));
      const gain = cfg.base_delta * Math.pow(cfg.delta_scale, i);
      cc += cost; cg += gain;
      margCost.push(cost); cumCost.push(cc);
      margGain.push(gain); cumGain.push(cg);
    }
    return {
      costSeries: [
        { data: margCost, color: '#c94040', label: 'cost/lvl' },
        { data: cumCost,  color: '#f87171', label: 'cum_cost', dashed: true },
      ],
      gainSeries: [
        { data: margGain, color: '#16a34a', label: 'gain/lvl' },
        { data: cumGain,  color: '#4ade80', label: 'cum_gain', dashed: true },
      ],
    };
  }

  if (systemVal.startsWith('agent/')) {
    const key = { coder: 'coder', support: 'support', marketer: 'marketer', pm: 'product_manager', ceo: 'ceo' }[systemVal.slice(6)];
    const cfg = LAB.agents[key];
    const minorCost = [], totalCost = [], boost = [], cumBoost = [];
    let ct = 0, cb = 0;
    for (let i = 0; i < N; i++) {
      const mc = Math.floor(cfg.minor_base_cost * Math.pow(cfg.minor_cost_scale, i));
      const mjc = (i > 0 && i % 10 === 9)
        ? Math.floor(cfg.major_base_cost * Math.pow(cfg.major_cost_scale, Math.floor(i / 10)))
        : 0;
      const b = cfg.base_delta * Math.pow(cfg.delta_scale, i) * Math.pow(cfg.major_pow, Math.floor(i / 10));
      ct += mc + mjc; cb += b;
      minorCost.push(mc); totalCost.push(ct);
      boost.push(b); cumBoost.push(cb);
    }
    return {
      costSeries: [
        { data: minorCost, color: '#2563eb', label: 'minor/lvl' },
        { data: totalCost, color: '#93c5fd', label: 'cum_total', dashed: true },
      ],
      gainSeries: [
        { data: boost,    color: '#7c3aed', label: 'boost/lvl' },
        { data: cumBoost, color: '#a78bfa', label: 'cum_boost', dashed: true },
      ],
    };
  }

  if (systemVal.startsWith('hw/')) {
    const cfg = systemVal === 'hw/gpu' ? INVESTMENTS.rcu.gpu : INVESTMENTS.rcu.cpu;
    const costs = [], cumCosts = [], mults = [];
    let cc = 0;
    for (let i = 0; i < N; i++) {
      const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_scale, i));
      cc += cost;
      costs.push(cost); cumCosts.push(cc);
      mults.push(1 + (i + 1) * cfg.delta);
    }
    return {
      costSeries: [
        { data: costs,    color: '#c94040', label: 'cost/lvl' },
        { data: cumCosts, color: '#f87171', label: 'cum_cost', dashed: true },
      ],
      gainSeries: [
        { data: mults, color: '#d97706', label: 'rcu_mult', dashed: false },
      ],
    };
  }

  return { costSeries: [], gainSeries: [] };
}

// ── Canvas chart drawing ─────────────────────────────────────────
function fmtVal(v) {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  if (Math.abs(v) >= 1)   return v.toFixed(2);
  return v.toPrecision(2);
}

function plotChart(canvas, { title, series, yLog = false }) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width || 400;
  const cssH = rect.height || 200;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = cssW, H = cssH;
  const pad = { top: 22, right: 20, bottom: 28, left: 62 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  const allVals = series.flatMap(s => s.data).filter(v => v > 0);
  if (!allVals.length) {
    ctx.fillStyle = '#444';
    ctx.font = `11px var(--mono, monospace)`;
    ctx.textAlign = 'center';
    ctx.fillText('no data', W / 2, H / 2);
    return;
  }

  const maxVal = Math.max(...allVals);
  const minVal = Math.min(...allVals);
  const N = series[0].data.length;

  function toX(i) { return pad.left + (i / (N - 1)) * pw; }
  function toY(v) {
    if (yLog) {
      const lv   = Math.log10(Math.max(v, 1e-9));
      const lmin = Math.log10(Math.max(minVal, 1e-9));
      const lmax = Math.log10(maxVal);
      if (lmax === lmin) return pad.top + ph / 2;
      return pad.top + ph - ((lv - lmin) / (lmax - lmin)) * ph;
    }
    return pad.top + ph - (maxVal === 0 ? 0 : (v / maxVal) * ph);
  }

  // Grid + Y labels
  ctx.font = `9px var(--mono, monospace)`;
  ctx.textAlign = 'right';
  if (yLog) {
    const lmin = Math.floor(Math.log10(Math.max(minVal, 1)));
    const lmax = Math.ceil(Math.log10(maxVal));
    for (let p = lmin; p <= lmax; p++) {
      const y = toY(Math.pow(10, p));
      if (y < pad.top - 2 || y > pad.top + ph + 2) continue;
      ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.fillText(fmtVal(Math.pow(10, p)), pad.left - 4, y + 3);
    }
  } else {
    for (let t = 0; t <= 4; t++) {
      const v = (maxVal / 4) * t;
      const y = toY(v);
      ctx.strokeStyle = '#1e1e28'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.fillText(fmtVal(v), pad.left - 4, y + 3);
    }
  }

  // X axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = '#444';
  const xTicks = N <= 30 ? [0, 5, 10, 15, 20, N - 1] : [0, 10, 20, 30, 40, N - 1];
  for (const i of xTicks) {
    if (i >= N) continue;
    ctx.fillText(String(i), toX(i), pad.top + ph + 16);
  }

  // Axes
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + ph);
  ctx.lineTo(pad.left + pw, pad.top + ph);
  ctx.stroke();

  // Title + legend (top-left inside plot)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#555'; ctx.font = `9px var(--mono, monospace)`;
  ctx.fillText(title, pad.left + 4, pad.top - 6);

  // Series lines
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    ctx.strokeStyle = s.color; ctx.lineWidth = s.dashed ? 1 : 1.5;
    ctx.setLineDash(s.dashed ? [5, 4] : []);
    ctx.beginPath();
    let started = false;
    s.data.forEach((v, i) => {
      if (v <= 0 && yLog) return;
      const x = toX(i), y = toY(v);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend chip (top-right)
    if (s.label) {
      const lx = W - pad.right - 2;
      const ly = pad.top + si * 14 + 4;
      ctx.fillStyle = s.color;
      ctx.fillRect(lx - 52, ly - 7, 8, 8);
      ctx.fillStyle = '#888'; ctx.font = `9px var(--mono, monospace)`;
      ctx.textAlign = 'right';
      ctx.fillText(s.label, lx, ly + 1);
    }
  }
}

// ── HTML + styles ────────────────────────────────────────────────
function injectStyles() {
  const el = document.createElement('style');
  el.textContent = `
    #dev-analysis-overlay {
      position: fixed; inset: 0; display: none;
      background: rgba(8,8,12,0.95); backdrop-filter: blur(4px);
      z-index: 10001; font-family: 'JetBrains Mono','Fira Code','Courier New',monospace;
      font-size: 12px; color: #ccc;
    }
    #dev-analysis-overlay.on { display: grid; }
    #da-panel {
      display: grid;
      grid-template-rows: 40px 1fr;
      grid-template-columns: 360px 1fr;
      width: 100%; height: 100%; overflow: hidden;
    }
    #da-header {
      grid-column: 1 / -1;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; background: #111; border-bottom: 1px solid #222;
    }
    #da-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666; }
    #da-close {
      background: none; border: 1px solid #333; color: #666;
      font-family: inherit; font-size: 10px; padding: 3px 10px; cursor: pointer; border-radius: 3px;
    }
    #da-close:hover { border-color: #666; color: #ccc; }
    #da-left { overflow-y: auto; padding: 10px; background: #0c0c10; border-right: 1px solid #1e1e28; }
    #da-right {
      display: flex; flex-direction: column; gap: 10px;
      padding: 12px; background: #090910; overflow: hidden;
    }
    .da-group { border: 1px solid #1e1e28; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
    .da-group-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 8px; background: #141420; border-bottom: 1px solid #1e1e28;
    }
    .da-group-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .da-reset-btn {
      font-family: inherit; font-size: 9px; padding: 1px 6px;
      background: none; border: 1px solid #2a2a2a; color: #444; cursor: pointer; border-radius: 2px;
    }
    .da-reset-btn:hover { border-color: #c94040; color: #c94040; }
    .da-field {
      display: flex; justify-content: space-between; align-items: center;
      padding: 3px 8px; border-bottom: 1px solid #111;
    }
    .da-field:last-child { border-bottom: none; }
    .da-field-label { font-size: 10px; color: #666; flex: 1; }
    .da-field-input {
      width: 88px; background: #080810; border: 1px solid #2a2a2a;
      color: #ddd; padding: 2px 5px; font-family: inherit; font-size: 10px;
      border-radius: 2px; text-align: right;
    }
    .da-field-input:focus { outline: none; border-color: #16a34a; }
    #da-curve-controls {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #da-curve-controls label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
    #da-system {
      flex: 1; background: #141420; border: 1px solid #2a2a2a;
      color: #ccc; font-family: inherit; font-size: 10px; padding: 4px 6px; border-radius: 3px;
    }
    #da-max-level {
      width: 48px; background: #141420; border: 1px solid #2a2a2a;
      color: #ccc; font-family: inherit; font-size: 10px; padding: 3px 5px; border-radius: 3px; text-align: center;
    }
    .da-canvas-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .da-canvas-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #444; margin-bottom: 4px; }
    .da-canvas-el { display: block; width: 100%; flex: 1; min-height: 0; border-radius: 4px; }
  `;
  document.head.appendChild(el);
}

function buildHTML() {
  const sysOptions = SYSTEMS.map(s => `<option value="${s.value}">${s.label}</option>`).join('');

  let groupsHTML = '';
  for (const group of GROUPS) {
    let fieldsHTML = '';
    for (const field of group.fields) {
      const val = resolveValue(field.path);
      fieldsHTML += `<div class="da-field">
        <label class="da-field-label">${field.label}</label>
        <input class="da-field-input" type="number" data-path="${field.path}" step="${field.step ?? 'any'}" value="${val}">
      </div>`;
    }
    groupsHTML += `<div class="da-group">
      <div class="da-group-head">
        <span class="da-group-label">${group.label}</span>
        <button class="da-reset-btn" data-reset="${group.id}">reset</button>
      </div>
      ${fieldsHTML}
    </div>`;
  }

  return `
    <div id="da-panel">
      <div id="da-header">
        <span id="da-title">[ analysis_tool ]</span>
        <button id="da-close">✕ close (Esc)</button>
      </div>
      <div id="da-left">${groupsHTML}</div>
      <div id="da-right">
        <div id="da-curve-controls">
          <label>system</label>
          <select id="da-system">${sysOptions}</select>
          <label>levels</label>
          <input id="da-max-level" type="number" value="50" min="5" max="200" step="5">
        </div>
        <div class="da-canvas-wrap">
          <div class="da-canvas-title">cost_curve (log scale)</div>
          <canvas class="da-canvas-el" id="da-canvas-cost"></canvas>
        </div>
        <div class="da-canvas-wrap">
          <div class="da-canvas-title">gain_curve</div>
          <canvas class="da-canvas-el" id="da-canvas-gain"></canvas>
        </div>
      </div>
    </div>
  `;
}

// ── Module state ─────────────────────────────────────────────────
let _overlay = null;

function syncInputsToConstants() {
  const panel = document.getElementById('da-left');
  if (!panel) return;
  panel.querySelectorAll('.da-field-input[data-path]').forEach(input => {
    input.value = resolveValue(input.dataset.path);
  });
}

function drawCurves() {
  const system = document.getElementById('da-system')?.value ?? 'sf/conversion';
  const N = Math.max(2, parseInt(document.getElementById('da-max-level')?.value) || 50);
  const { costSeries, gainSeries } = computeCurves(system, N);
  const costCanvas = document.getElementById('da-canvas-cost');
  const gainCanvas = document.getElementById('da-canvas-gain');
  if (costCanvas) plotChart(costCanvas, { title: 'cost / cumulative_cost', series: costSeries, yLog: true });
  if (gainCanvas) plotChart(gainCanvas, { title: 'gain / cumulative_gain', series: gainSeries, yLog: false });
}

// ── Public API ───────────────────────────────────────────────────
export function initDevAnalysis() {
  injectStyles();

  _overlay = document.createElement('div');
  _overlay.id = 'dev-analysis-overlay';
  _overlay.innerHTML = buildHTML();
  document.body.appendChild(_overlay);

  _overlay.querySelector('#da-close').addEventListener('click', () => {
    _overlay.classList.remove('on');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _overlay.classList.contains('on')) {
      _overlay.classList.remove('on');
    }
  });

  _overlay.querySelector('#da-system').addEventListener('change', drawCurves);
  _overlay.querySelector('#da-max-level').addEventListener('input', drawCurves);

  // Constant input changes — delegate from parent
  _overlay.querySelector('#da-left').addEventListener('input', e => {
    const path = e.target.dataset?.path;
    if (!path) return;
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) { updateValue(path, val); drawCurves(); }
  });

  // Reset buttons — delegate
  _overlay.querySelector('#da-left').addEventListener('click', e => {
    const groupId = e.target.dataset?.reset;
    if (!groupId) return;
    resetGroup(groupId);
    syncInputsToConstants();
    drawCurves();
  });
}

export function openDevAnalysis() {
  _overlay?.classList.add('on');
  requestAnimationFrame(drawCurves);
}
