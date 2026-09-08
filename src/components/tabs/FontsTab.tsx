import React, { useState } from 'react';
import {
  Type,
  Copy,
  Check,
  ExternalLink,
  Download,
  Sparkles,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { ExtractedFont, ExtractedSite } from '../../types';

interface FontsTabProps {
  site: ExtractedSite;
}

export const FontsTab: React.FC<FontsTabProps> = ({ site }) => {
  const [selectedFont, setSelectedFont] = useState<ExtractedFont>(site.fonts[0] || {
    family: 'Inter',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    sizes: [],
    fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
    sampleText: 'The quick brown fox jumps over the lazy dog.',
  });

  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');
  const [customSize, setCustomSize] = useState(32);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 1600);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">
              {site.fonts.length > 0 ? `${site.fonts.length} Font Families Detected` : 'Web Typography Hierarchy'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              Weights, type scale steps, line-heights and CSS definitions
            </p>
          </div>
        </div>

        {selectedFont.googleFontUrl && (
          <a
            href={selectedFont.googleFontUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <span>Google Fonts</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Font Family Selector (if multiple) */}
      {site.fonts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {site.fonts.map(font => (
            <button
              key={font.family}
              onClick={() => setSelectedFont(font)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                selectedFont.family === font.family
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              {font.family}
            </button>
          ))}
        </div>
      )}

      {/* Font Family Overview Card */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{selectedFont.family}</h2>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                {selectedFont.category}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Fallback stack: {selectedFont.fallbacks.join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleCopy(
                  `font-family: "${selectedFont.family}", ${selectedFont.fallbacks.join(', ')};`,
                  'CSS Font Family'
                )
              }
              className="h-7 px-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 text-xs flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Copy CSS</span>
            </button>

            <button
              onClick={() =>
                handleCopy(
                  `--font-${selectedFont.family.toLowerCase()}: "${selectedFont.family}", ${selectedFont.fallbacks.join(', ')};`,
                  'Tailwind v4 Token'
                )
              }
              className="h-7 px-2.5 bg-neutral-950 hover:bg-neutral-800 text-indigo-400 rounded border border-neutral-800 text-xs flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Tailwind Token</span>
            </button>
          </div>
        </div>

        {/* Weights detected */}
        <div>
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Detected Weights
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFont.weights.map(weight => {
              const weightNames: Record<number, string> = {
                300: 'Light',
                400: 'Regular',
                500: 'Medium',
                600: 'SemiBold',
                700: 'Bold',
                800: 'ExtraBold',
                900: 'Black',
              };
              return (
                <div
                  key={weight}
                  className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center gap-2"
                >
                  <span className="font-mono text-xs font-semibold text-indigo-400">{weight}</span>
                  <span className="text-xs text-neutral-300">{weightNames[weight] || 'Custom'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Specimen Box */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium">Interactive Specimen</span>
            <div className="flex items-center gap-2">
              <span>{customSize}px</span>
              <input
                type="range"
                min="14"
                max="72"
                value={customSize}
                onChange={e => setCustomSize(Number(e.target.value))}
                className="w-24 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          <input
            type="text"
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
            placeholder="Type custom text to preview..."
          />

          <div
            className="p-4 bg-neutral-950 border border-neutral-800/80 rounded-xl text-neutral-100 overflow-x-auto select-all"
            style={{
              fontFamily: `"${selectedFont.family}", ${selectedFont.fallbacks.join(', ')}`,
              fontSize: `${customSize}px`,
              lineHeight: 1.25,
            }}
          >
            {previewText}
          </div>
        </div>
      </div>

      {/* Extracted Modular Type Scale */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-200">
            Extracted Type Scale & Hierarchy
          </h3>
          <span className="text-[11px] text-neutral-400">
            Based on detected computed styles
          </span>
        </div>

        <div className="space-y-2.5">
          {selectedFont.sizes.map((step, idx) => (
            <div
              key={idx}
              className="p-3 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400">{step.label}</span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {step.sizePx}px / {step.rem}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    LH: {step.lineHeight} • LS: {step.tracking}
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(step.tailwindClass, step.tailwindClass)}
                  className="text-[11px] font-mono text-neutral-400 hover:text-white bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 transition-colors flex items-center gap-1"
                  title="Copy Tailwind class"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{step.tailwindClass}</span>
                </button>
              </div>

              <div
                className="text-neutral-200 truncate py-1"
                style={{
                  fontFamily: `"${selectedFont.family}", sans-serif`,
                  fontSize: `${Math.min(28, step.sizePx)}px`,
                  lineHeight: step.lineHeight,
                  letterSpacing: step.tracking,
                }}
              >
                {step.sample}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast Feedback */}
      {copiedLabel && (
        <div className="fixed bottom-4 right-6 px-3 py-2 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-lg shadow-2xl text-xs font-medium z-50">
          Copied {copiedLabel} to clipboard!
        </div>
      )}
    </div>
  );
};
