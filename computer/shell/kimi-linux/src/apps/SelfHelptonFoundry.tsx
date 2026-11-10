import type { FC } from 'react';

/**
 * Minimal glue: opens Alexis's original Self-Helpton Foundry HTML unchanged
 * (donors/copied/self-helpton-foundry/index.html, also served from /apps/...).
 */
const SelfHelptonFoundry: FC = () => (
  <iframe
    title="Self-Helpton Foundry"
    src="/apps/self-helpton-foundry/index.html"
    style={{ width: '100%', height: '100%', border: 0, background: '#1e1e1e' }}
  />
);

export default SelfHelptonFoundry;
