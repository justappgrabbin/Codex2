// Synthia view: starts the models when the computer opens and runs chat on-device.
import { createModels, systemPrompt, activeRole } from '/synthia-models.mjs';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
const models = createModels();
globalThis.SynthiaModels = models;

function renderSlots() {
  $('#modelSlots').innerHTML = Object.values(models).map(m => {
    const pct = Math.round(m.progress * 100);
    const status = m.state === 'loading' ? `downloading ${pct}%` : m.state === 'ready' ? `ready · ${m.device}` : m.state === 'error' ? `error: ${esc(m.error)}` : 'not loaded';
    return `<div class="model-slot"><b>${esc(m.spec.label)}</b> <span>${status}</span>
      <div class="bar"><i style="width:${m.state === 'ready' ? 100 : pct}%"></i></div>
      ${m.state === 'idle' || m.state === 'error' ? `<button class="quiet" data-load="${m.role}">Download</button>` : ''}</div>`;
  }).join('');
  $('#modelSlots').querySelectorAll('[data-load]').forEach(b => b.onclick = () => models[b.dataset.load].load());
}
for (const m of Object.values(models)) m.on(renderSlots);
renderSlots();
// Start on boot: the active model (talker unless you switched) begins loading immediately.
const startRole = activeRole();
$('#chatRole').value = startRole;
models[startRole].load();
$('#chatRole').addEventListener('change', e => { const m = models[e.target.value]; if (m.state === 'idle') m.load(); });

const history = [];
function addLine(who, text) {
  const div = document.createElement('div');
  div.className = `msg ${who}`; div.textContent = text;
  $('#chatLog').append(div); $('#chatLog').scrollTop = 1e9;
  return div;
}
$('#chatForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('#chatInput').value.trim(); if (!text) return;
  const slot = models[$('#chatRole').value];
  $('#chatInput').value = '';
  addLine('you', text);
  if (slot.state !== 'ready') {
    addLine('sys', `${slot.spec.label} is ${slot.state === 'loading' ? `still downloading (${Math.round(slot.progress * 100)}%)` : 'not loaded yet — tap Download above'}.`);
    if (slot.state === 'idle') slot.load();
    return;
  }
  history.push({ role: 'user', content: text });
  const out = addLine('synthia', '');
  $('#chatSend').disabled = true;
  try {
    const reply = await slot.chat([{ role: 'system', content: systemPrompt(globalThis.SynthAIComputer) }, ...history.slice(-8)],
      { onToken: t => { out.textContent += t; $('#chatLog').scrollTop = 1e9; } });
    out.textContent = reply;
    history.push({ role: 'assistant', content: reply });
  } catch (err) { out.textContent = `error: ${err.message}`; }
  $('#chatSend').disabled = false;
});
