export const REMEMBER_KEYS: readonly string[];
export function pushSettings(): Promise<void>;
export function installSettingsRemember(): void;
export function rememberTheme(theme: { mode?: string; accent?: string; wallpaper?: string }): void;
export function startSettingsRemember(): Promise<{ mode?: string; accent?: string; wallpaper?: string } | null>;
