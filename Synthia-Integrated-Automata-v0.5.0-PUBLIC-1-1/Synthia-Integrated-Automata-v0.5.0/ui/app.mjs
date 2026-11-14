const $ = (selector) => document.querySelector(selector);
const pretty = (value) => JSON.stringify(value, null, 2);
let catalog = [];

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const value = await response.json();
  if (!response.ok || value.ok === false) throw new Error(value.error ?? `request failed: ${response.status}`);
  return value;
}

function setPanel(id) {
  document.querySelectorAll('.panel').forEach((node) => node.classList.toggle('active', node.id === id));
  document.querySelectorAll('.nav').forEach((node) => node.classList.toggle('active', node.dataset.panel === id));
  if (id === 'outbox') loadProposals();
}
document.querySelectorAll('.nav').forEach((button) => button.addEventListener('click', () => setPanel(button.dataset.panel)));

async function loadStatus() {
  const status = await api('/api/status');
  $('.system-state').classList.add('live');
  $('#state-label').textContent = status.ok ? 'organism live' : 'attention required';
  const labels = { liveProcesses: 'live processes', hands: 'hands', meshes: 'local meshes', channels: 'channels', instruments: 'instruments' };
  $('#metrics').innerHTML = Object.entries(status.counts).map(([key, value]) => `<div class="metric"><strong>${value}</strong><span>${labels[key]}</span></div>`).join('');
  $('#dimensions').innerHTML = status.dimensions.map((dimension, index) => `<div class="dimension">0${index + 1} · ${dimension}</div>`).join('');
}

function refreshInstrumentList() {
  const kind = $('#tray-kind').value;
  const entries = catalog.filter((entry) => entry.kind === kind);
  $('#tray-id').innerHTML = entries.map((entry) => `<option value="${entry.id}">${entry.label}</option>`).join('');
  refreshMeta();
}
function refreshMeta() {
  const entry = catalog.find((candidate) => candidate.kind === $('#tray-kind').value && candidate.id === $('#tray-id').value);
  $('#instrument-meta').textContent = entry ? `${entry.center ? `${entry.center}${entry.gate ? ` · Gate ${entry.gate}` : ''} · ` : ''}${(entry.capabilities ?? []).join(' · ')}` : '';
}
async function loadTray() {
  const data = await api('/api/tray');
  catalog = data.instruments;
  const kinds = [...new Set(catalog.map((entry) => entry.kind))];
  $('#tray-kind').innerHTML = kinds.map((kind) => `<option value="${kind}">${kind}</option>`).join('');
  refreshInstrumentList();
}
$('#tray-kind').addEventListener('change', refreshInstrumentList);
$('#tray-id').addEventListener('change', refreshMeta);
$('#run-instrument').addEventListener('click', async () => {
  const button = $('#run-instrument');
  try {
    button.disabled = true; $('#run-state').textContent = 'running through live mesh…';
    const input = JSON.parse($('#tray-input').value || '{}');
    const result = await api('/api/tray', { method: 'POST', body: JSON.stringify({ kind: $('#tray-kind').value, id: $('#tray-id').value, input, context: { personId: 'front-screen' } }) });
    $('#tray-output').textContent = pretty(result); $('#run-state').textContent = 'complete';
  } catch (error) { $('#tray-output').textContent = `${error.name}: ${error.message}`; $('#run-state').textContent = 'failed'; }
  finally { button.disabled = false; }
});

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input'); const text = input.value.trim(); if (!text) return;
  const log = $('#chat-log');
  log.insertAdjacentHTML('beforeend', `<div class="message user"></div>`); log.lastElementChild.textContent = text;
  input.value = ''; const button = event.submitter; button.disabled = true;
  try {
    const result = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: text, context: { personId: 'front-screen' } }) });
    log.insertAdjacentHTML('beforeend', '<div class="message synthia"></div>'); log.lastElementChild.textContent = result.utterance;
    log.insertAdjacentHTML('beforeend', '<div class="message trace"></div>');
    log.lastElementChild.textContent = `Trace · ${result.pipelineTrace.map((entry) => entry.stage).join(' → ')} · coordinated ${result.coordination.participants.length} population instruments · ${result.federation.centers.channels.length} active channel path(s)`;
  } catch (error) { log.insertAdjacentHTML('beforeend', '<div class="message trace"></div>'); log.lastElementChild.textContent = error.message; }
  finally { button.disabled = false; log.scrollTop = log.scrollHeight; }
});

async function loadChannels() {
  const data = await api('/api/channels');
  $('#channel-grid').innerHTML = data.channels.map((channel) => `<article class="channel"><strong>${channel.id}</strong><h3>${channel.name}</h3><p>${channel.gates.join(' ↔ ')} · higher-order opposite-equivalent composite</p><span class="status">${channel.neuralAnalogueStatus}</span></article>`).join('');
}

async function proposalAction(operation, proposalId) {
  await api('/api/proposals', { method: 'POST', body: JSON.stringify({ operation, proposalId }) });
  await loadProposals();
}
async function loadProposals() {
  const data = await api('/api/proposals');
  const pending = data.proposals.filter((proposal) => proposal.status === 'pending');
  $('#proposal-list').innerHTML = pending.length ? pending.map((proposal) => `<article class="proposal"><header><strong>${proposal.kind}</strong><span>${proposal.flow} · ${proposal.status}</span></header><p>${proposal.proposedChange.description ?? proposal.reasoning}</p><p>${proposal.reasoning}</p><div class="actions"><button data-accept="${proposal.id}">Accept</button><button data-dismiss="${proposal.id}">Dismiss</button></div></article>`).join('') : '<div class="empty">No pending proposals. The append-only ledger remains available in the API.</div>';
  document.querySelectorAll('[data-accept]').forEach((button) => button.addEventListener('click', () => proposalAction('accept', button.dataset.accept)));
  document.querySelectorAll('[data-dismiss]').forEach((button) => button.addEventListener('click', () => proposalAction('dismiss', button.dataset.dismiss)));
}

Promise.all([loadStatus(), loadTray(), loadChannels()]).catch((error) => {
  $('#state-label').textContent = `offline · ${error.message}`;
});
