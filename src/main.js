// main.js — entry point
// Boots the game: initialises state, wires up the tick loop, renders the UI.

import { initState } from './engine/state.js';
import { startTick } from './engine/tick.js';
import { load } from './engine/save.js';
import { render } from './ui/render.js';

const state = load() ?? initState();
render(state);
startTick(state, render);
