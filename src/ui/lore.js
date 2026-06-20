// lore.js — one-time tab discovery overlays
// showLore(tab, state, renderFn) shows the #lore-overlay with tab-specific text.
// For saas_product it also collects the product name before closing.

import { MILESTONES } from '../engine/state.js';
import { save } from '../engine/save.js';

const LORE = {
  write_code: {
    lines: [
      'Another late night in the home office.',
      'Grinding freelance gigs pays the bills — but I know there\'s a bigger game to play.',
      'Some people sell startups for a billion dollars.',
      'With $1B I could retire happy. But... we\'re not there yet. haha.',
    ],
  },
  saas_product: {
    lines: [
      'Okay. Enough client work.',
      'Time to build something that\'s actually mine — from scratch.',
      'What are we calling it?',
    ],
    hasNameInput: true,
  },
  investment: {
    lines: [
      'Money. Real, hard-earned money.',
      'From here I can upgrade my coding gear or pour fuel into the SaaS.',
      'Every dollar spent here is sweat turned into leverage.',
    ],
  },
  frontier_lab: {
    lines: [
      '██████  FRONTIER LAB  ██████',
      'Welcome, valued partner. We have been... expecting you.',
      'Our agents are eager to assist. Productivity will increase.',
      'The first tier is always free.*',
      '',
      '* By continuing you agree to our standard soul lease agreement.',
    ],
    creepy: true,
  },
  post_on_x: {
    lines: [
      'Oh. Right.',
      'I have an X account.',
    ],
  },
  milestones: {
    lines: [
      'Here I can track everything I\'ve accomplished.',
      'Some of these are still locked...',
      'I wonder what\'s hiding behind those \'???\'',
    ],
  },
};

// Returns false when a tab's content is not yet accessible (gate not met).
// Lore only fires once the gate is passed.
export function isTabUnlocked(tab, state) {
  if (tab === 'saas_product') {
    return (state.freelance.missionsCompleted ?? 0) >= MILESTONES.freelance_tiers.t0;
  }
  if (tab === 'frontier_lab') {
    return !!state.milestones?.claimed?.lab_unlock;
  }
  return true;
}

export function showLore(tab, state, renderFn) {
  const entry = LORE[tab];
  if (!entry) return;

  const overlay  = document.getElementById('lore-overlay');
  const card     = document.getElementById('lore-card');
  const textEl   = document.getElementById('lore-text');
  const formEl   = document.getElementById('lore-form');
  const inputEl  = document.getElementById('lore-product-input');
  const okBtn    = document.getElementById('lore-ok');
  if (!overlay || !textEl || !okBtn) return;

  // Populate text
  textEl.innerHTML = entry.lines
    .map(l => l === '' ? '<br>' : `<p>${l}</p>`)
    .join('');

  // Creepy mode for frontier_lab
  if (entry.creepy) {
    card?.classList.add('creepy');
  } else {
    card?.classList.remove('creepy');
  }

  // Show or hide the product name form
  if (formEl) formEl.style.display = entry.hasNameInput ? '' : 'none';
  if (inputEl) inputEl.value = '';

  // Update button label
  okBtn.textContent = entry.hasNameInput ? 'let\'s build' : 'ok';

  overlay.classList.add('on');
  if (entry.hasNameInput && inputEl) inputEl.focus();

  // Wire dismiss — replace any old listener by cloning the button
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);

  newOk.addEventListener('click', () => {
    if (entry.hasNameInput) {
      const name = (inputEl?.value || '').trim();
      if (!name) { inputEl?.focus(); return; }
      state.productName = name;
    }
    overlay.classList.remove('on');
    save(state);
    renderFn(state);
  });
}
