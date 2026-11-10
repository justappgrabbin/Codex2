export const SETTINGS_KEY: string;
export const DEFAULT_SETTINGS: Readonly<{ selfHelptonPanel: boolean }>;
export function loadSettings(storage?: Storage): { selfHelptonPanel: boolean };
export function saveSettings(partial: { selfHelptonPanel?: boolean }, storage?: Storage): { selfHelptonPanel: boolean };
export function setSelfHelptonPanelEnabled(on: boolean, storage?: Storage): { selfHelptonPanel: boolean };
