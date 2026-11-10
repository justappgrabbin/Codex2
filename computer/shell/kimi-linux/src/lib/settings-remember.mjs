// WIRE — Alexis's Settings screen writes localStorage itself (ubuntuos_settings).
// The shell also keeps the Self-Helpton toggle in synthia_computer_settings.
// This copies those same strings to the local computer service and, after a
// restart, puts them back before Settings reads them. Her Settings.tsx is unchanged.

export const REMEMBER_KEYS = ['ubuntuos_settings', 'synthia_computer_settings', 'synthia_computer_theme'];

let installed = false;
let pushChain = Promise.resolve();
let pushTimer = 0;

function snapshot() {
  const body = {};
  for (const key of REMEMBER_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) body[key] = value;
  }
  return body;
}

export function pushSettings() {
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    const body = snapshot();
    pushChain = pushChain.then(async () => {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }).catch(() => { /* Her local copy remains if the service is briefly down. */ });
  }, 40);
  return pushChain;
}

export function installSettingsRemember() {
  if (installed || typeof localStorage === 'undefined') return;
  installed = true;
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItemRemember(key, value) {
    original.call(this, key, value);
    if (this === localStorage && REMEMBER_KEYS.includes(key)) pushSettings();
  };
}

export function rememberTheme(theme) {
  localStorage.setItem('synthia_computer_theme', JSON.stringify(theme));
}

export async function startSettingsRemember() {
  installSettingsRemember();
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const remote = await response.json();
      for (const key of REMEMBER_KEYS) {
        if (typeof remote[key] === 'string' && localStorage.getItem(key) == null) {
          localStorage.setItem(key, remote[key]);
        }
      }
    }
  } catch { /* Offline: the keys she already stored in this browser stay. */ }
  try {
    const raw = localStorage.getItem('synthia_computer_theme');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
