import React, { useState } from 'react';
import {
  Copy,
  Check,
  Pipette,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  Hash,
  ShieldCheck
} from 'lucide-react';
import { ColorRole, ExtractedColor, ExtractedSite } from '../../types';
import { formatColor, generateColorRamp } from '../../utils/colorUtils';

interface ColorsTabProps {
  site: ExtractedSite;
  eyedropperHistory: string[];
  onPickEyedropper: () => void;
  onSelectColor: (hex: string) => void;
}

export const ColorsTab: React.FC<ColorsTabProps> = ({
  site,
  eyedropperHistory,
  onPickEyedropper,
  onSelectColor,
}) => {
  const [activeRole, setActiveRole] = useState<ColorRole | 'all'>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [customHexInput, setCustomHexInput] = useState('');
  const [expandedRamp, setExpandedRamp] = useState<string | null>(site.colorRamps[0]?.name || null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 1600);
  };

  const filteredColors = site.colors.filter(c => {
    if (activeRole === 'all') return true;
    return c.role === activeRole;
  });

  if (site.colors.length === 0) {
    return (
      <div className="space-y-5 pb-8">
        <div className="neo-empty-state p-6">
          <div className="text-4xl mb-4">+</div>
          <p className="text-xs font-mono uppercase tracking-wider mb-2">Start a collection</p>
          <h2 className="text-2xl font-black tracking-tight mb-3">Your palette is waiting.</h2>
          <p className="text-sm leading-relaxed mb-5">
            Paste a website URL in the top bar. Gobble will find the colors, type, assets, and design tokens for you.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="neo-chip">01 Paste URL</span>
            <span className="neo-chip">02 Extract</span>
            <span className="neo-chip">03 Explore</span>
          </div>
        </div>
        <div className="neo-tip p-4">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>New here? Try the Presets menu for a ready-made example.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="colors-tab space-y-5 pb-8">
      {/* Top Banner & Eyedropper Trigger */}
      <div className="colors-overview">
        <div className="flex items-center gap-2.5">
          <div className="colors-overview-icon">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="colors-eyebrow">Extracted palette</p>
            <h2>{site.colors.length} colors found</h2>
            <p className="colors-overview-copy">Grouped by purpose and checked for readable contrast.</p>
          </div>
        </div>

        <button
          onClick={onPickEyedropper}
          className="colors-action"
        >
          <Pipette className="w-3.5 h-3.5" />
          <span>Sample a color</span>
        </button>
      </div>

      {/* Eyedropper History (if any) */}
      {eyedropperHistory.length > 0 && (
        <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Eyedropper Recent History</span>
            <span className="text-neutral-500 font-normal">{eyedropperHistory.length} sampled</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {eyedropperHistory.map((hex, idx) => (
              <button
                key={`${hex}-${idx}`}
                onClick={() => handleCopy(hex, `Eyedropper ${hex}`)}
                className="group flex items-center gap-1.5 px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors shrink-0"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-mono text-[11px] text-neutral-300">{hex}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role Filter Chips */}
      <div className="colors-filters" aria-label="Filter colors by role">
        {(['all', 'brand', 'background', 'text', 'border', 'accent'] as const).map(role => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`colors-filter ${activeRole === role ? 'is-active' : ''} ${
              activeRole === role
                ? ''
                : 'is-muted'
            }`}
          >
            {role === 'all' ? 'All colors' : role}
          </button>
        ))}
      </div>

      {/* Color Swatch Grid */}
      <div className="colors-grid">
        {filteredColors.map(color => (
          <div
            key={color.id}
            className="color-card"
          >
            <div className="color-card-heading">
              {/* Swatch preview */}
              <div className="color-swatch-wrap">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleCopy(color.hex, color.hex)}
                  title="Click to copy HEX"
                />
                <span className="color-occurrences">{color.occurrences} uses</span>
              </div>

              {/* Specs & info */}
              <div className="color-card-info">
                <div className="color-title-row">
                  <h3>{color.name}</h3>
                  <span className={`color-role role-${color.role}`}>{color.role}</span>
                </div>
                <div className="color-values">
                  <span>{color.hex}</span>
                  <span>{color.rgb}</span>
                </div>
              </div>
            </div>

            {/* WCAG Compliance Badge */}
            <div className="contrast-panel">
              <div className="contrast-heading">
                <ShieldCheck className="w-4 h-4" />
                <span>Accessibility contrast</span>
              </div>
              <div className="contrast-grid">
                  <div className="contrast-item">
                    <span>On dark</span>
                    <span
                      className={color.contrastOnDark >= 4.5 ? 'contrast-pass' : 'contrast-low'}
                    >
                      {color.contrastOnDark.toFixed(1)}:1
                    </span>
                    <span className={`contrast-badge ${color.contrastOnDark >= 4.5 ? 'pass' : 'low'}`}>
                      {color.contrastOnDark >= 4.5 ? (color.contrastOnDark >= 7 ? 'AAA' : 'AA') : 'Low'}
                    </span>
                  </div>

                  <div className="contrast-item">
                    <span>On light</span>
                    <span
                      className={color.contrastOnLight >= 4.5 ? 'contrast-pass' : 'contrast-low'}
                    >
                      {color.contrastOnLight.toFixed(1)}:1
                    </span>
                    <span className={`contrast-badge ${color.contrastOnLight >= 4.5 ? 'pass' : 'low'}`}>
                      {color.contrastOnLight >= 4.5 ? (color.contrastOnLight >= 7 ? 'AAA' : 'AA') : 'Low'}
                    </span>
                  </div>
              </div>
            </div>

            {/* Quick Copy Buttons */}
            <div className="color-copy-row">
                  <button
                    onClick={() => handleCopy(color.hex, `HEX ${color.hex}`)}
                    className="color-copy-button"
                    title="Copy HEX code"
                  >
                    <Copy className="w-3 h-3" /> HEX
                  </button>

                  <button
                    onClick={() => handleCopy(color.tailwindClass, `Tailwind ${color.tailwindClass}`)}
                    className="color-copy-button"
                    title="Copy Tailwind class"
                  >
                    <Sparkles className="w-3 h-3" /> Tailwind
                  </button>

                  <button
                    onClick={() => handleCopy(color.hsl, `HSL ${color.hsl}`)}
                    className="color-copy-button"
                    title="Copy HSL"
                  >
                    HSL
                  </button>
            </div>
          </div>
        ))}
      </div>

      {/* 11-Step Color Ramps Section */}
      <div className="pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              11-Step Color Ramps (Tailwind v4 Scale)
            </h3>
            <p className="text-[11px] text-neutral-400">
              Generated from detected brand values (50, 100, 200, ... 900, 950)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {site.colorRamps.map(ramp => (
            <div
              key={ramp.name}
              className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: ramp.baseHex }}
                  />
                  <span className="text-xs font-semibold text-neutral-200">{ramp.name}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Base: {ramp.baseHex}</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      ramp.steps.map(s => `--color-${ramp.name.toLowerCase().replace(/\s+/g, '-')}-${s.step}: ${s.hex};`).join('\n'),
                      `All ${ramp.name} CSS vars`
                    )
                  }
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy CSS Ramp</span>
                </button>
              </div>

              {/* Ramp swatches row */}
              <div className="grid grid-cols-11 gap-1">
                {ramp.steps.map(step => (
                  <div
                    key={step.step}
                    onClick={() => handleCopy(step.hex, `${ramp.name} ${step.step}: ${step.hex}`)}
                    className="group cursor-pointer flex flex-col items-center"
                    title={`Step ${step.step}: ${step.hex} (Click to copy)`}
                  >
                    <div
                      className={`w-full h-8 rounded-md ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-indigo-400 transition-all ${
                        step.isBase ? 'ring-2 ring-white/60' : ''
                      }`}
                      style={{ backgroundColor: step.hex }}
                    />
                    <span className="mt-1 text-[9px] font-mono text-neutral-400 group-hover:text-white">
                      {step.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {copyFeedback && (
        <div className="fixed bottom-4 right-6 px-3 py-2 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-lg shadow-2xl text-xs font-medium flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Copied {copyFeedback} to clipboard!</span>
        </div>
      )}
    </div>
  );
};
