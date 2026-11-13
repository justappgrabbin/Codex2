import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  setSelfHelptonPanelEnabled,
} from '../shell/kimi-linux/src/lib/editor-settings.mjs';

function memoryStorage(seed) {
  const map = new Map(Object.entries(seed ?? {}));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

test('Self-Helpton panel setting is off by default', () => {
  const storage = memoryStorage();
  assert.equal(DEFAULT_SETTINGS.selfHelptonPanel, false);
  assert.equal(loadSettings(storage).selfHelptonPanel, false);
  assert.equal(storage.getItem(SETTINGS_KEY), null);
});

test('Self-Helpton panel setting persists when turned on and off', () => {
  const storage = memoryStorage();
  setSelfHelptonPanelEnabled(true, storage);
  const written = JSON.parse(storage.getItem(SETTINGS_KEY));
  assert.equal(written.selfHelptonPanel, true);
  assert.equal(loadSettings(storage).selfHelptonPanel, true);

  const fresh = memoryStorage({ [SETTINGS_KEY]: storage.getItem(SETTINGS_KEY) });
  assert.equal(loadSettings(fresh).selfHelptonPanel, true);

  saveSettings({ selfHelptonPanel: false }, fresh);
  assert.equal(loadSettings(fresh).selfHelptonPanel, false);
  assert.equal(JSON.parse(fresh.getItem(SETTINGS_KEY)).selfHelptonPanel, false);
});
