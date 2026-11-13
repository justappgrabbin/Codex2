// Settings persistence for the Computer shell.
// Uses the same localStorage pattern as desktop icons (`synthia_computer_*`).

export const SETTINGS_KEY = 'synthia_computer_settings';

export const DEFAULT_SETTINGS = Object.freeze({
  selfHelptonPanel: false,
});

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(storage) {
  const store = resolveStorage(storage);
  if (!store) return { ...DEFAULT_SETTINGS };
  try {
    const raw = store.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      selfHelptonPanel: parsed.selfHelptonPanel === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(partial, storage) {
  const store = resolveStorage(storage);
  const next = { ...loadSettings(store), ...partial };
  next.selfHelptonPanel = next.selfHelptonPanel === true;
  if (store) store.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function setSelfHelptonPanelEnabled(on, storage) {
  return saveSettings({ selfHelptonPanel: !!on }, storage);
}
