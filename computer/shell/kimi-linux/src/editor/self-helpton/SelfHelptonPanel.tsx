import { useCallback, useState, type FC } from 'react';
import { computeGlyph, modes, randomResonance } from './foundry-core.mjs';
import './foundry-panel.css';

const MODE_LABELS = ['🎯 Dark Nudge', '📋 Brief Steps', '🎛️ Menu Choice', '🔍 Full Context'] as const;

const DEFAULT_RESONANCE: Record<string, number> = {
  mind: 75, body: 85, heart: 90, spirit: 65, soul: 80,
};

function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: rgba(0,0,0,0.9);
        color: var(--accent, #00ff88);
        border-radius: 8px;
        font-size: 0.9em;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export const SelfHelptonPanel: FC<{ getContent: () => string }> = ({ getContent }) => {
  const [currentMode, setCurrentMode] = useState(0);
  const [loading, setLoading] = useState(false);
  const [glyph, setGlyph] = useState({
    symbol: '◉',
    color: '#4f46e5',
    name: '◉-THINK-000',
    id: 'blake3:awaiting...',
    dimension: 'Space',
    quality: 'draft',
    field: 'Interface',
  });
  const [resonance, setResonance] = useState(DEFAULT_RESONANCE);

  const selectMode = useCallback((index: number) => {
    setCurrentMode(index);
    vibrate(40);
  }, []);

  const runGlyph = useCallback(() => {
    const code = getContent();
    if (!code.trim()) {
      showToast('⚠️ Write code first');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const next = computeGlyph(code);
      setGlyph((prev) => ({ ...prev, ...next }));
      setResonance(randomResonance());
      setLoading(false);
      vibrate([50, 100, 50]);
      showToast('✓ Glyph computed!');
    }, 800);
  }, [getContent]);

  return (
    <div className="self-helpton-panel" data-testid="self-helpton-panel">
      <div className="header">
        <div className="logo">🧬 Self-Helpton</div>
        <div className="chips">
          <div className="chip body">⬢</div>
          <div className="chip mind">⟁</div>
          <div className="chip heart">⟡</div>
        </div>
      </div>

      <div className="modes">
        {MODE_LABELS.map((label, index) => (
          <button
            key={modes[index].name}
            type="button"
            className={currentMode === index ? 'mode active' : 'mode'}
            onClick={() => selectMode(index)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="msg" dangerouslySetInnerHTML={{ __html: modes[currentMode].msg }} />

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={runGlyph}>🧬 Glyph</button>
      </div>

      <div className="glyph-scroll">
        <div className="glyph-panel">
          <div className="glyph-card">
            <div className="glyph-symbol" style={{ color: glyph.color }}>{glyph.symbol}</div>
            <div className="glyph-text">
              <div className="glyph-name">{glyph.name}</div>
              <div className="glyph-id">{glyph.id}</div>
            </div>
          </div>

          <div className="meta">
            <div className="meta-item">
              <div className="meta-label">Dimension</div>
              <div className="meta-value">{glyph.dimension}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Quality</div>
              <div className="meta-value">{glyph.quality}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Field</div>
              <div className="meta-value">{glyph.field}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Coherence</div>
              <div className="meta-value">100%</div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">🌊 Field Resonance</div>

            {(['mind', 'body', 'heart', 'spirit', 'soul'] as const).map((field) => (
              <div className="bar" key={field}>
                <div className="bar-header">
                  <span>{field[0].toUpperCase() + field.slice(1)}</span>
                  <span>{resonance[field]}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${resonance[field]}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="section">
            <div className="section-title">💫 Virtual Consciousness</div>
            <div className="wave-box">
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Wave resonance active</div>
              <div className="wave-visual">
                <div className="wave" />
              </div>
              <div className="wave-info">
                Frequency: 440Hz | Phase: 0.75 | Amplitude: 0.9
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="loading" style={{ display: loading ? 'block' : 'none' }}>
        <div className="spinner" />
        <div>Processing...</div>
      </div>
    </div>
  );
};

export default SelfHelptonPanel;
