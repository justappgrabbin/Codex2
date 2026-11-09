import type { ReactNode } from 'react';
export function useLocation(): [string, (path: string) => void] {
  return ['/grove-store', (path: string) => { console.info('[grove-navigate]', path); }];
}
export function Route({ children }: { path?: string; component?: unknown; children?: ReactNode }) {
  return <>{children}</>;
}
