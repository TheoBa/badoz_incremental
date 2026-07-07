// dev-analysis.js — developer analysis panel for game balancing

import { CONSTANTS, MILESTONES, FREELANCE, SAAS, LAB, INVESTMENTS } from '../engine/state.js';
import { runSim, saveSim, loadSims, deleteSim } from '../engine/simulator.js';

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

    /* ── view toggle ── */
    #da-view-tabs { display: flex; gap: 4px; flex-shrink: 0; }
    .da-tab {
      font-family: inherit; font-size: 10px; padding: 3px 12px;
      background: none; border: 1px solid #2a2a2a; color: #555; cursor: pointer; border-radius: 3px;
    }
    .da-tab.on { border-color: #2563eb; color: #2563eb; }
    #da-snapshot-section {
      display: none; flex-direction: column; gap: 8px; flex: 1; overflow: hidden;
    }
    #da-snapshot-section.on { display: flex; }

    /* ── snapshot controls ── */
    .da-snap-block { flex-shrink: 0; }
    .da-snap-row {
      display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
    }
    .da-snap-row label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; width: 52px; }
    .da-snap-num {
      width: 80px; background: #141420; border: 1px solid #2a2a2a;
      color: #ccc; font-family: inherit; font-size: 10px; padding: 2px 5px; border-radius: 2px; text-align: right;
    }
    .da-snap-range {
      flex: 1; accent-color: #2563eb; cursor: pointer;
    }
    .da-snap-sel {
      background: #141420; border: 1px solid #2a2a2a; color: #ccc;
      font-family: inherit; font-size: 10px; padding: 2px 5px; border-radius: 2px;
    }
    .da-snap-days { width: 44px; }

    /* ── upgrade table ── */
    #da-snap-table-wrap { flex: 1; overflow-y: auto; min-height: 0; }
    #da-snap-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    #da-snap-table thead th {
      text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;
      color: #444; padding: 4px 6px; border-bottom: 1px solid #1e1e28; position: sticky; top: 0; background: #090910;
    }
    #da-snap-table td { padding: 4px 6px; border-bottom: 1px solid #111; color: #888; }
    #da-snap-table tr:last-child td { border-bottom: none; }
    .da-snap-track { color: #555; }
    .da-snap-lvl { color: #ccc; font-weight: 600; text-align: right; }
    .da-snap-gain { color: #4ade80; }
    .da-snap-spent { color: #333; font-size: 9px; }
    .da-snap-sep td { background: #0f0f18; color: #333; font-size: 9px; padding: 2px 6px; }

    /* ── derived stats ── */
    #da-snap-stats { flex-shrink: 0; border-top: 1px solid #1e1e28; padding-top: 8px; }
    .da-stat-row {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 3px 0; border-bottom: 1px solid #111; font-size: 10px;
    }
    .da-stat-row:last-child { border-bottom: none; }
    .da-stat-row span { color: #555; }
    .da-stat-row b { color: #ccc; font-weight: 600; }
    .da-stat-note { font-size: 9px; color: #333; margin-left: 6px; font-weight: 400; }

    /* ── simulator tab ── */
    #da-simulator-section {
      display: none; flex-direction: row; flex: 1; gap: 10px; overflow: hidden; min-height: 0;
    }
    #da-simulator-section.on { display: flex; }
    #da-sim-left {
      width: 210px; flex-shrink: 0; overflow-y: auto;
      background: #0c0c10; border-right: 1px solid #1e1e28; padding: 8px;
    }
    #da-sim-right {
      flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; min-height: 0;
    }
    .da-sim-section-label {
      font-size: 9px; text-transform: uppercase; letter-spacing: 1px;
      color: #444; margin-bottom: 6px; margin-top: 10px;
    }
    .da-sim-section-label:first-child { margin-top: 0; }
    .da-sim-row {
      display: flex; align-items: center; gap: 5px; margin-bottom: 5px;
    }
    .da-sim-row label { font-size: 9px; color: #555; width: 76px; flex-shrink: 0; }
    .da-sim-input {
      flex: 1; background: #141420; border: 1px solid #2a2a2a; color: #ccc;
      font-family: inherit; font-size: 10px; padding: 2px 5px; border-radius: 2px;
    }
    .da-sim-range { flex: 1; accent-color: #2563eb; }
    .da-sim-select {
      flex: 1; background: #141420; border: 1px solid #2a2a2a; color: #ccc;
      font-family: inherit; font-size: 10px; padding: 2px 4px; border-radius: 2px;
    }
    .da-sim-check-row {
      display: flex; align-items: center; gap: 5px; margin-bottom: 4px;
      font-size: 10px; color: #666;
    }
    .da-sim-check-row input[type=checkbox] { accent-color: #2563eb; }
    #da-sim-run-btn {
      width: 100%; margin-top: 8px; padding: 6px; font-family: inherit; font-size: 11px;
      background: none; border: 1px solid #2563eb; color: #2563eb; cursor: pointer; border-radius: 3px;
    }
    #da-sim-run-btn:hover { background: rgba(37,99,235,0.1); }
    #da-sim-run-btn:disabled { border-color: #333; color: #444; cursor: not-allowed; }
    #da-sim-status { font-size: 9px; color: #444; margin-top: 4px; min-height: 12px; text-align: center; }
    #da-sim-metric-row {
      display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 0 2px;
    }
    #da-sim-metric-row label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
    #da-sim-metric { background: #141420; border: 1px solid #2a2a2a; color: #ccc; font-family: inherit; font-size: 10px; padding: 3px 6px; border-radius: 3px; }
    #da-sim-canvas-wrap { flex: 1; min-height: 0; }
    #da-sim-canvas { display: block; width: 100%; height: 100%; border-radius: 4px; }
    #da-sim-runs {
      flex-shrink: 0; max-height: 130px; overflow-y: auto;
      border-top: 1px solid #1e1e28; padding-top: 6px;
    }
    .da-sim-run-row {
      display: flex; align-items: center; gap: 6px; padding: 3px 2px;
      border-bottom: 1px solid #111; font-size: 10px;
    }
    .da-sim-run-row:last-child { border-bottom: none; }
    .da-sim-run-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .da-sim-run-name { flex: 1; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .da-sim-run-win { color: #16a34a; white-space: nowrap; }
    .da-sim-run-nowin { color: #555; }
    .da-sim-run-del {
      background: none; border: none; color: #333; cursor: pointer; font-size: 11px; padding: 0 2px;
    }
    .da-sim-run-del:hover { color: #c94040; }
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

  const defMoneySlider = valueToLogSlider(5000, 1, 1e9).toFixed(4);
  const defRcuSlider   = valueToLogSlider(1000, 1, 1e6).toFixed(4);

  return `
    <div id="da-panel">
      <div id="da-header">
        <span id="da-title">[ analysis_tool ]</span>
        <button id="da-close">✕ close (Esc)</button>
      </div>
      <div id="da-left">${groupsHTML}</div>
      <div id="da-right">

        <div id="da-view-tabs">
          <button class="da-tab on" id="da-tab-curves">curves</button>
          <button class="da-tab"    id="da-tab-snapshot">snapshot</button>
          <button class="da-tab"    id="da-tab-simulator">simulator</button>
        </div>

        <!-- ── curves section ── -->
        <div id="da-curves-section" style="display:flex;flex-direction:column;gap:10px;flex:1;overflow:hidden;">
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

        <!-- ── snapshot section ── -->
        <div id="da-snapshot-section">
          <div class="da-snap-block">
            <div class="da-snap-row">
              <label>money_$</label>
              <input id="da-snap-money-val"   class="da-snap-num" type="number" value="5000" min="1" max="1000000000">
              <input id="da-snap-money-range" class="da-snap-range" type="range" min="0" max="1" step="0.001" value="${defMoneySlider}">
            </div>
            <div class="da-snap-row">
              <label>rcu</label>
              <input id="da-snap-rcu-val"   class="da-snap-num" type="number" value="1000" min="1" max="1000000">
              <input id="da-snap-rcu-range" class="da-snap-range" type="range" min="0" max="1" step="0.001" value="${defRcuSlider}">
            </div>
            <div class="da-snap-row">
              <label>price</label>
              <select id="da-snap-price" class="da-snap-sel">
                <option value="10">$10/mo</option>
                <option value="100">$100/mo</option>
                <option value="1000">$1000/mo</option>
              </select>
              <label style="width:32px">plan</label>
              <select id="da-snap-plan" class="da-snap-sel">
                <option value="free">free ×1</option>
                <option value="hobbyist">hobbyist ×1.5</option>
                <option value="growth">growth ×4</option>
                <option value="scale">scale ×12</option>
                <option value="infernal">infernal ×40</option>
              </select>
              <label style="width:32px">days</label>
              <input id="da-snap-days" class="da-snap-num da-snap-days" type="number" value="30" min="1" max="365">
            </div>
          </div>

          <div id="da-snap-table-wrap">
            <table id="da-snap-table">
              <thead>
                <tr>
                  <th>track</th><th style="text-align:right">lvl</th>
                  <th>gain</th><th>budget_used</th>
                </tr>
              </thead>
              <tbody id="da-snap-tbody"></tbody>
            </table>
          </div>

          <div id="da-snap-stats">
            <div class="da-stat-row">
              <span>rcu/click</span>
              <b id="da-s-rcu-click">—</b>
            </div>
            <div class="da-stat-row">
              <span>rcu/h <span class="da-stat-note">(full RCU → coder)</span></span>
              <b id="da-s-rcu-h">—</b>
            </div>
            <div class="da-stat-row">
              <span>customers <span class="da-stat-note">(equal RCU split → saas)</span></span>
              <b id="da-s-customers">—</b>
            </div>
            <div class="da-stat-row">
              <span>mrr</span>
              <b id="da-s-mrr">—</b>
            </div>
          </div>
        </div>

        <!-- ── simulator section ── -->
        <div id="da-simulator-section">
          <div id="da-sim-left">
            <div class="da-sim-section-label">strategy</div>
            <div class="da-sim-row">
              <label>name</label>
              <input id="da-sim-name" class="da-sim-input" type="text" value="my_strategy" maxlength="24">
            </div>
            <div class="da-sim-row">
              <label>clicks/tick</label>
              <input id="da-sim-clicks-val" class="da-sim-input" type="number" value="3" min="0" max="20" style="width:36px;flex:none">
              <input id="da-sim-clicks-range" class="da-sim-range" type="range" min="0" max="20" value="3" step="1">
            </div>

            <div class="da-sim-section-label">rcu_priority</div>
            <div class="da-sim-row"><label>slot_1</label><select class="da-sim-select da-sim-rcu-pri" data-slot="0">
              <option value="conversion" selected>conversion</option><option value="retention">retention</option><option value="marketing">marketing</option><option value="coder">coder</option>
            </select></div>
            <div class="da-sim-row"><label>slot_2</label><select class="da-sim-select da-sim-rcu-pri" data-slot="1">
              <option value="conversion">conversion</option><option value="retention" selected>retention</option><option value="marketing">marketing</option><option value="coder">coder</option>
            </select></div>
            <div class="da-sim-row"><label>slot_3</label><select class="da-sim-select da-sim-rcu-pri" data-slot="2">
              <option value="conversion">conversion</option><option value="retention">retention</option><option value="marketing" selected>marketing</option><option value="coder">coder</option>
            </select></div>
            <div class="da-sim-row"><label>slot_4</label><select class="da-sim-select da-sim-rcu-pri" data-slot="3">
              <option value="conversion">conversion</option><option value="retention">retention</option><option value="marketing">marketing</option><option value="coder" selected>coder</option>
            </select></div>

            <div class="da-sim-section-label">money_priority</div>
            <div class="da-sim-row"><label>slot_1</label><select class="da-sim-select da-sim-money-pri" data-slot="0">
              <option value="cpu" selected>cpu</option><option value="gear">gear</option><option value="laptop">laptop</option><option value="gpu">gpu</option>
            </select></div>
            <div class="da-sim-row"><label>slot_2</label><select class="da-sim-select da-sim-money-pri" data-slot="1">
              <option value="cpu">cpu</option><option value="gear" selected>gear</option><option value="laptop">laptop</option><option value="gpu">gpu</option>
            </select></div>
            <div class="da-sim-row"><label>slot_3</label><select class="da-sim-select da-sim-money-pri" data-slot="2">
              <option value="cpu">cpu</option><option value="gear">gear</option><option value="laptop" selected>laptop</option><option value="gpu">gpu</option>
            </select></div>
            <div class="da-sim-row"><label>slot_4</label><select class="da-sim-select da-sim-money-pri" data-slot="3">
              <option value="cpu">cpu</option><option value="gear">gear</option><option value="laptop">laptop</option><option value="gpu" selected>gpu</option>
            </select></div>

            <div class="da-sim-section-label">settings</div>
            <div class="da-sim-row">
              <label>target_plan</label>
              <select id="da-sim-plan" class="da-sim-select">
                <option value="free">free</option>
                <option value="hobbyist">hobbyist</option>
                <option value="growth" selected>growth</option>
                <option value="scale">scale</option>
                <option value="infernal">infernal</option>
              </select>
            </div>
            <div class="da-sim-row">
              <label>max_days</label>
              <input id="da-sim-maxdays" class="da-sim-input" type="number" value="365" min="30" max="1000">
            </div>
            <div class="da-sim-check-row">
              <input type="checkbox" id="da-sim-missions" checked>
              <label for="da-sim-missions">accept_missions</label>
            </div>
            <div class="da-sim-check-row">
              <input type="checkbox" id="da-sim-post" checked>
              <label for="da-sim-post">always_post_on_x</label>
            </div>

            <button id="da-sim-run-btn">▶ run_sim()</button>
            <div id="da-sim-status"></div>
          </div>

          <div id="da-sim-right">
            <div id="da-sim-metric-row">
              <label>metric</label>
              <select id="da-sim-metric">
                <option value="moneyLifetime">lifetime_earned</option>
                <option value="mrr" selected>mrr</option>
                <option value="wallet">wallet</option>
                <option value="customers">customers</option>
                <option value="rcuH">rcu/h</option>
              </select>
            </div>
            <div id="da-sim-canvas-wrap">
              <canvas id="da-sim-canvas"></canvas>
            </div>
            <div id="da-sim-runs"></div>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ── Log-scale slider helpers ─────────────────────────────────────
function logSliderToValue(pos, min, max) {
  return Math.round(Math.pow(10, pos * (Math.log10(max) - Math.log10(min)) + Math.log10(min)));
}
function valueToLogSlider(val, min, max) {
  return (Math.log10(Math.max(val, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
}

// ── Snapshot helpers ─────────────────────────────────────────────
function maxLevel(budget, baseCost, costScale, maxN = 300) {
  let cum = 0;
  for (let i = 0; i < maxN; i++) {
    const cost = Math.floor(baseCost * Math.pow(costScale, i));
    if (cum + cost > budget) return { level: i, spent: cum };
    cum += cost;
  }
  return { level: maxN, spent: cum };
}

function steppedLevel(budget, tiers) {
  let cum = 0, level = 0;
  for (const t of tiers) {
    if (cum + t.cost <= budget) { cum += t.cost; level++; } else break;
  }
  return { level, spent: cum };
}

function cumGainAt(level, baseDelta, deltaScale) {
  let g = 0;
  for (let i = 0; i < level; i++) g += baseDelta * Math.pow(deltaScale, i);
  return g;
}

function agentBoostAt(level, cfg) {
  return cfg.base_delta * Math.pow(cfg.delta_scale, level) * Math.pow(cfg.major_pow, Math.floor(level / 10));
}

function fmtNum(v) {
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'k';
  return '$' + v.toFixed(0);
}
function fmtPlain(v, dp = 2) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(dp);
}

function simMRR(rcuBudget, price, planName, days) {
  const split    = rcuBudget / 3;
  const convCfg  = SAAS.ship_feature.conversion;
  const retCfg   = SAAS.ship_feature.retention;
  const mktCfg   = SAAS.ship_feature.marketing;

  const convLvl = maxLevel(split, convCfg.base_cost, convCfg.cost_scale).level;
  const retLvl  = maxLevel(split, retCfg.base_cost,  retCfg.cost_scale).level;
  const mktLvl  = maxLevel(split, mktCfg.base_cost,  mktCfg.cost_scale).level;

  const saasConversion = cumGainAt(convLvl, convCfg.base_delta, convCfg.delta_scale);
  const saasRetention  = 1 + cumGainAt(retLvl, retCfg.base_delta, retCfg.delta_scale);
  const saasMarketing  = cumGainAt(mktLvl, mktCfg.base_delta, mktCfg.delta_scale);

  let customers = 0;
  for (let d = 0; d < days; d++) {
    const visitors  = (1 + saasMarketing) * 1.0;
    const convRate  = saasConversion > 0 ? (saasConversion) / (saasConversion + 2) : 0;
    const gained    = visitors * convRate;
    const churnRate = 0.02 / saasRetention;
    customers = Math.max(0, customers + gained - customers * churnRate);
  }
  return { customers: Math.floor(customers), mrr: price * Math.floor(customers) };
}

function drawSnapshot() {
  const money = parseFloat(document.getElementById('da-snap-money-val')?.value) || 0;
  const rcu   = parseFloat(document.getElementById('da-snap-rcu-val')?.value)   || 0;
  const price = parseFloat(document.getElementById('da-snap-price')?.value)     || 10;
  const plan  = document.getElementById('da-snap-plan')?.value ?? 'free';
  const days  = parseInt(document.getElementById('da-snap-days')?.value)        || 30;
  const planMult = LAB.plans[plan]?.multiplier ?? 1;

  // ── RCU tracks ──────────────────────────────────────────────────
  const convCfg = SAAS.ship_feature.conversion;
  const retCfg  = SAAS.ship_feature.retention;
  const mktCfg  = SAAS.ship_feature.marketing;
  const coderCfg = LAB.agents.coder;

  const conv  = maxLevel(rcu, convCfg.base_cost,    convCfg.cost_scale);
  const ret   = maxLevel(rcu, retCfg.base_cost,     retCfg.cost_scale);
  const mkt   = maxLevel(rcu, mktCfg.base_cost,     mktCfg.cost_scale);
  const coder = maxLevel(rcu, coderCfg.minor_base_cost, coderCfg.minor_cost_scale);

  const convGain  = cumGainAt(conv.level, convCfg.base_delta, convCfg.delta_scale);
  const retGain   = cumGainAt(ret.level,  retCfg.base_delta,  retCfg.delta_scale);
  const mktGain   = cumGainAt(mkt.level,  mktCfg.base_delta,  mktCfg.delta_scale);
  const coderBoost = agentBoostAt(coder.level, coderCfg) * planMult;

  // ── Money tracks ─────────────────────────────────────────────────
  const gearTiers   = Object.values(INVESTMENTS.rcu.gear);
  const laptopTiers = Object.values(INVESTMENTS.rcu.laptop);
  const cpuCfg      = INVESTMENTS.rcu.cpu;
  const gpuCfg      = INVESTMENTS.rcu.gpu;

  const gear   = steppedLevel(money, gearTiers);
  const laptop = steppedLevel(money, laptopTiers);
  const cpu    = maxLevel(money, cpuCfg.base_cost, cpuCfg.cost_scale);
  const gpu    = maxLevel(money, gpuCfg.base_cost, gpuCfg.cost_scale);

  const gearBonus   = gearTiers.slice(0, gear.level).reduce((s, t) => s + t.boost, 0);
  const laptopBonus = laptopTiers.slice(0, laptop.level).reduce((s, t) => s + t.boost, 0);
  const cpuMult     = 1 + cpu.level * cpuCfg.delta;
  const gpuMult     = 1 + gpu.level * gpuCfg.delta;
  const rcuPerClick = Math.floor((1 + gearBonus + laptopBonus) * cpuMult * gpuMult);

  // ── Update table ─────────────────────────────────────────────────
  const tbody = document.getElementById('da-snap-tbody');
  if (!tbody) return;

  const rcuRows = [
    { label: '[RCU] conversion',  lvl: conv.level,  gain: `+${fmtPlain(convGain, 2)} conv`,      spent: conv.spent,  budget: rcu },
    { label: '[RCU] retention',   lvl: ret.level,   gain: `+${fmtPlain(retGain, 2)} ret`,        spent: ret.spent,   budget: rcu },
    { label: '[RCU] marketing',   lvl: mkt.level,   gain: `+${fmtPlain(mktGain, 1)}/d`,          spent: mkt.spent,   budget: rcu },
    { label: '[RCU] coder_minor', lvl: coder.level, gain: `${fmtPlain(coderBoost, 2)} RCU/h`,   spent: coder.spent, budget: rcu },
  ];
  const moneyRows = [
    { label: '[$]  gear',   lvl: gear.level,   gain: `+${gearBonus} RCU/click`,  spent: gear.spent,   budget: money },
    { label: '[$]  laptop', lvl: laptop.level, gain: `+${laptopBonus} RCU/click`,spent: laptop.spent, budget: money },
    { label: '[$]  cpu',    lvl: cpu.level,    gain: `×${cpuMult.toFixed(2)} mult`,spent: cpu.spent,  budget: money },
    { label: '[$]  gpu',    lvl: gpu.level,    gain: `×${gpuMult.toFixed(2)} mult`,spent: gpu.spent, budget: money },
  ];

  function renderRows(rows, sep) {
    let html = '';
    if (sep) html += `<tr class="da-snap-sep"><td colspan="4">— ${sep} —</td></tr>`;
    for (const r of rows) {
      const pct = r.budget > 0 ? Math.min(100, (r.spent / r.budget) * 100).toFixed(0) : 0;
      html += `<tr>
        <td class="da-snap-track">${r.label}</td>
        <td class="da-snap-lvl">${r.lvl}</td>
        <td class="da-snap-gain">${r.gain}</td>
        <td class="da-snap-spent">${fmtPlain(r.spent)} / ${fmtPlain(r.budget)} (${pct}%)</td>
      </tr>`;
    }
    return html;
  }
  tbody.innerHTML = renderRows(rcuRows, 'rcu') + renderRows(moneyRows, 'money');

  // ── Update derived stats ──────────────────────────────────────────
  document.getElementById('da-s-rcu-click').textContent  = rcuPerClick;
  document.getElementById('da-s-rcu-h').textContent      = fmtPlain(coderBoost, 2);

  const sim = simMRR(rcu, price, plan, days);
  document.getElementById('da-s-customers').textContent  = `${sim.customers} after ${days}d`;
  document.getElementById('da-s-mrr').textContent        = fmtNum(sim.mrr);
}

// ── Module state ─────────────────────────────────────────────────
let _overlay = null;
let _activeView = 'curves';

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

// ── Simulator helpers ────────────────────────────────────────────
const SIM_COLORS = ['#2563eb','#16a34a','#c94040','#d97706','#7c3aed','#db2777','#a89200','#0891b2'];
let _simSelectedIds = new Set();

function readStrategy() {
  const rcuPri   = [...document.querySelectorAll('.da-sim-rcu-pri')]
    .sort((a,b) => a.dataset.slot - b.dataset.slot).map(s => s.value);
  const moneyPri = [...document.querySelectorAll('.da-sim-money-pri')]
    .sort((a,b) => a.dataset.slot - b.dataset.slot).map(s => s.value);
  return {
    name:           document.getElementById('da-sim-name')?.value ?? 'run',
    clicksPerTick:  parseInt(document.getElementById('da-sim-clicks-val')?.value) || 0,
    rcuPriority:    rcuPri,
    moneyPriority:  moneyPri,
    targetPlan:     document.getElementById('da-sim-plan')?.value ?? 'growth',
    maxDays:        parseInt(document.getElementById('da-sim-maxdays')?.value) || 365,
    acceptMissions: document.getElementById('da-sim-missions')?.checked !== false,
    alwaysPost:     document.getElementById('da-sim-post')?.checked !== false,
  };
}

function refreshSimRunsList() {
  const el = document.getElementById('da-sim-runs');
  if (!el) return;
  const sims = loadSims();
  if (!sims.length) { el.innerHTML = '<div style="font-size:9px;color:#333;padding:4px 0;">no saved runs</div>'; return; }
  el.innerHTML = sims.map((sim, idx) => {
    const color   = SIM_COLORS[idx % SIM_COLORS.length];
    const checked = _simSelectedIds.has(sim.id);
    const winText = sim.winDay != null
      ? `<span class="da-sim-run-win">${sim.winDay}d</span>`
      : `<span class="da-sim-run-nowin">—</span>`;
    return `<div class="da-sim-run-row">
      <input type="checkbox" data-simid="${sim.id}" ${checked ? 'checked' : ''} style="accent-color:${color}">
      <span class="da-sim-run-dot" style="background:${color}"></span>
      <span class="da-sim-run-name" title="${sim.name}">${sim.name}</span>
      ${winText}
      <button class="da-sim-run-del" data-del="${sim.id}" title="delete">✕</button>
    </div>`;
  }).join('');

  el.querySelectorAll('input[type=checkbox][data-simid]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.simid);
      cb.checked ? _simSelectedIds.add(id) : _simSelectedIds.delete(id);
      drawSimChart();
    });
  });
  el.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.del);
      deleteSim(id);
      _simSelectedIds.delete(id);
      refreshSimRunsList();
      drawSimChart();
    });
  });
}

function drawSimChart() {
  const canvas  = document.getElementById('da-sim-canvas');
  if (!canvas) return;
  const metric  = document.getElementById('da-sim-metric')?.value ?? 'mrr';
  const sims    = loadSims();
  const selected = sims.filter((s, idx) => _simSelectedIds.has(s.id));

  if (!selected.length) {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = (rect.width  || 400) * dpr;
    canvas.height = (rect.height || 200) * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, rect.width || 400, rect.height || 200);
    ctx.fillStyle = '#333';
    ctx.font = '11px var(--mono, monospace)';
    ctx.textAlign = 'center';
    ctx.fillText('select runs below to compare', (rect.width || 400) / 2, (rect.height || 200) / 2);
    return;
  }

  const series = selected.map((sim, i) => {
    const simIdx = sims.indexOf(sim);
    return {
      data:   sim.timeline.map(e => e[metric] ?? 0),
      color:  SIM_COLORS[simIdx % SIM_COLORS.length],
      label:  sim.name + (sim.winDay != null ? ` (${sim.winDay}d)` : ' (—)'),
    };
  });

  const isLog   = metric === 'mrr' || metric === 'wallet' || metric === 'moneyLifetime';
  plotChart(canvas, { title: metric, series, yLog: isLog });
}

// ── View toggle ──────────────────────────────────────────────────
function switchView(view) {
  _activeView = view;
  const curvesSection   = document.getElementById('da-curves-section');
  const snapshotSection = document.getElementById('da-snapshot-section');
  const simSection      = document.getElementById('da-simulator-section');
  if (!curvesSection) return;
  curvesSection.style.display = view === 'curves' ? 'flex' : 'none';
  snapshotSection.classList.toggle('on',  view === 'snapshot');
  simSection.classList.toggle('on',       view === 'simulator');
  document.getElementById('da-tab-curves').classList.toggle('on',    view === 'curves');
  document.getElementById('da-tab-snapshot').classList.toggle('on',  view === 'snapshot');
  document.getElementById('da-tab-simulator').classList.toggle('on', view === 'simulator');
  if (view === 'curves')    requestAnimationFrame(drawCurves);
  if (view === 'snapshot')  requestAnimationFrame(drawSnapshot);
  if (view === 'simulator') requestAnimationFrame(() => { refreshSimRunsList(); drawSimChart(); });
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

  // View toggle buttons
  _overlay.querySelector('#da-tab-curves').addEventListener('click',    () => switchView('curves'));
  _overlay.querySelector('#da-tab-snapshot').addEventListener('click',  () => switchView('snapshot'));
  _overlay.querySelector('#da-tab-simulator').addEventListener('click', () => switchView('simulator'));

  // Curves controls
  _overlay.querySelector('#da-system').addEventListener('change', drawCurves);
  _overlay.querySelector('#da-max-level').addEventListener('input', drawCurves);

  // Constant input changes — delegate from parent
  _overlay.querySelector('#da-left').addEventListener('input', e => {
    const path = e.target.dataset?.path;
    if (!path) return;
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) { updateValue(path, val); if (_activeView === 'curves') drawCurves(); }
  });

  // Reset buttons — delegate
  _overlay.querySelector('#da-left').addEventListener('click', e => {
    const groupId = e.target.dataset?.reset;
    if (!groupId) return;
    resetGroup(groupId);
    syncInputsToConstants();
    if (_activeView === 'curves') drawCurves();
  });

  // Snapshot: money slider ↔ number input sync
  _overlay.querySelector('#da-snap-money-val').addEventListener('input', e => {
    const v = Math.max(1, parseFloat(e.target.value) || 1);
    _overlay.querySelector('#da-snap-money-range').value = valueToLogSlider(v, 1, 1e9);
    drawSnapshot();
  });
  _overlay.querySelector('#da-snap-money-range').addEventListener('input', e => {
    const v = logSliderToValue(parseFloat(e.target.value), 1, 1e9);
    _overlay.querySelector('#da-snap-money-val').value = v;
    drawSnapshot();
  });

  // Snapshot: RCU slider ↔ number input sync
  _overlay.querySelector('#da-snap-rcu-val').addEventListener('input', e => {
    const v = Math.max(1, parseFloat(e.target.value) || 1);
    _overlay.querySelector('#da-snap-rcu-range').value = valueToLogSlider(v, 1, 1e6);
    drawSnapshot();
  });
  _overlay.querySelector('#da-snap-rcu-range').addEventListener('input', e => {
    const v = logSliderToValue(parseFloat(e.target.value), 1, 1e6);
    _overlay.querySelector('#da-snap-rcu-val').value = v;
    drawSnapshot();
  });

  // Snapshot: selectors + days
  for (const id of ['da-snap-price', 'da-snap-plan', 'da-snap-days']) {
    _overlay.querySelector(`#${id}`).addEventListener('input', drawSnapshot);
  }

  // Simulator: clicks slider sync
  _overlay.querySelector('#da-sim-clicks-val').addEventListener('input', e => {
    _overlay.querySelector('#da-sim-clicks-range').value = e.target.value;
  });
  _overlay.querySelector('#da-sim-clicks-range').addEventListener('input', e => {
    _overlay.querySelector('#da-sim-clicks-val').value = e.target.value;
  });

  // Simulator: metric change redraws chart
  _overlay.querySelector('#da-sim-metric').addEventListener('change', drawSimChart);

  // Simulator: run button
  _overlay.querySelector('#da-sim-run-btn').addEventListener('click', () => {
    const btn    = _overlay.querySelector('#da-sim-run-btn');
    const status = _overlay.querySelector('#da-sim-status');
    btn.disabled = true;
    status.textContent = 'running…';
    requestAnimationFrame(() => {
      try {
        const strategy = readStrategy();
        const result   = runSim(strategy);
        saveSim(result);
        _simSelectedIds.add(result.id);
        refreshSimRunsList();
        drawSimChart();
        status.textContent = result.winDay != null
          ? `done — won day ${result.winDay}`
          : `done — no win in ${strategy.maxDays}d`;
      } catch (err) {
        status.textContent = 'error: ' + err.message;
      }
      btn.disabled = false;
    });
  });

  // Load existing sims on init
  loadSims().forEach(s => _simSelectedIds.add(s.id));
}

export function openDevAnalysis() {
  _overlay?.classList.add('on');
  requestAnimationFrame(_activeView === 'snapshot' ? drawSnapshot : drawCurves);
}
