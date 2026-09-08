import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Braces
} from 'lucide-react';
import { InspectableElement } from '../../types';

interface InspectTabProps {
  element: InspectableElement | null;
  onSelectElement: (el: InspectableElement) => void;
  availableElements: InspectableElement[];
}

export const InspectTab: React.FC<InspectTabProps> = ({
  element,
  onSelectElement,
  availableElements,
}) => {
  const [activePseudo, setActivePseudo] = useState<'normal' | 'hover' | 'focus' | 'active'>('normal');
  const [codeTab, setCodeTab] = useState<'tailwind' | 'css' | 'jsx' | 'html' | 'scss'>('tailwind');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!element) {
    return (
      <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Eye className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">No Element Selected</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Click any element on the canvas or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[11px]">Ctrl+Shift+C</kbd> to start inspecting box models, typography, and states.
          </p>
        </div>

        {availableElements.length > 0 && (
          <div className="pt-4 border-t border-neutral-800/80">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Or pick an inspected component:
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {availableElements.map(el => (
                <button
                  key={el.id}
                  onClick={() => onSelectElement(el)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs text-indigo-300 font-mono transition-colors"
                >
                  &lt;{el.tag}&gt; {el.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle styles under active pseudo-state
  const currentStyles =
    activePseudo === 'hover' && element.pseudoHover
      ? { ...element.computed, ...element.pseudoHover }
      : activePseudo === 'focus' && element.pseudoFocus
      ? { ...element.computed, ...element.pseudoFocus }
      : activePseudo === 'active' && element.pseudoActive
      ? { ...element.computed, ...element.pseudoActive }
      : element.computed;

  const handleCopy = (code: string, format: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const getCodeSnippet = () => {
    switch (codeTab) {
      case 'tailwind':
        return element.tailwindCode;
      case 'css':
        return element.cssCode;
      case 'jsx':
        return element.jsxCode;
      case 'html':
        return element.htmlCode;
      case 'scss':
        return element.scssCode;
      default:
        return element.tailwindCode;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Element Header Card */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-semibold border border-indigo-500/30">
              &lt;{element.tag}&gt;
            </span>
            <h3 className="text-sm font-bold text-white">{element.displayName}</h3>
            <span className="text-xs text-neutral-400 font-mono">{element.selector}</span>
          </div>

          <div className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
            {element.bounds.width} × {element.bounds.height} px
          </div>
        </div>

        {/* Pseudo-State Switcher Pills */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/80 text-xs">
          <span className="text-[11px] text-neutral-400 font-medium mr-1">State:</span>
          {(['normal', 'hover', 'focus', 'active'] as const).map(state => (
            <button
              key={state}
              onClick={() => setActivePseudo(state)}
              className={`px-2.5 py-1 rounded-lg font-mono transition-all capitalize ${
                activePseudo === state
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {state === 'normal' ? 'Default' : `:${state}`}
            </button>
          ))}
        </div>

        {(element.idAttribute || element.classes?.length || element.attributes?.length) && (
          <div className="border-t border-neutral-800/80 pt-3 space-y-1.5 text-xs font-mono">
            <div className="flex gap-2"><span className="text-neutral-500">id:</span><span className="text-neutral-200">{element.idAttribute || 'none'}</span></div>
            <div className="flex gap-2"><span className="text-neutral-500">classes:</span><span className="text-neutral-200 break-all">{element.classes?.join(' ') || 'none'}</span></div>
            <div className="flex gap-2"><span className="text-neutral-500">attributes:</span><span className="text-neutral-200 break-all">{element.attributes?.map(attribute => `${attribute.name}="${attribute.value}"`).join(' ') || 'none'}</span></div>
          </div>
        )}

        <div className="border-t border-neutral-800/80 pt-3 space-y-2 text-xs font-mono">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">DOM hierarchy</div>
          <div className="flex flex-wrap items-center gap-1 text-neutral-300">
            {(element.hierarchy || []).map((ancestor, index) => (
              <React.Fragment key={`${ancestor.selector}-${index}`}>
                {index > 0 && <span className="text-neutral-600">›</span>}
                <span className="rounded bg-neutral-950 px-1.5 py-1 border border-neutral-800">&lt;{ancestor.tag}&gt;</span>
              </React.Fragment>
            ))}
            {(element.hierarchy || []).length > 0 && <span className="text-neutral-600">›</span>}
            <span className="rounded bg-indigo-500/15 px-1.5 py-1 border border-indigo-500/30 text-indigo-200">&lt;{element.tag}&gt;</span>
          </div>
        </div>

        <div className="border-t border-neutral-800/80 pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
          <div className="text-neutral-500">x / y</div><div className="text-neutral-200">{Math.round(element.bounds.left)} / {Math.round(element.bounds.top)} px</div>
          <div className="text-neutral-500">bounding rect</div><div className="text-neutral-200">{Math.round(element.bounds.width)} × {Math.round(element.bounds.height)} px</div>
          <div className="text-neutral-500">box-sizing</div><div className="text-neutral-200">{currentStyles.boxSizing || 'unknown'}</div>
          <div className="text-neutral-500">position</div><div className="text-neutral-200">{currentStyles.position || 'unknown'} / z {currentStyles.zIndex || 'auto'}</div>
          <div className="text-neutral-500">opacity</div><div className="text-neutral-200">{currentStyles.opacity}</div>
        </div>
      </div>

      {/* Visual Box Model Diagram */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Box Model Breakdown
          </h4>
          <span className="text-[11px] text-neutral-500 font-mono">CSS Box Sizing</span>
        </div>

        {/* Nested concentric box model representation */}
        <div className="relative p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center font-mono text-xs select-none">
          <div className="absolute top-1 left-2 text-[10px] uppercase font-bold text-amber-400/80">
            Margin
          </div>
          <div className="mb-2 text-[11px]">{currentStyles.margin.top}</div>

          <div className="flex items-center justify-between">
            <span className="text-[11px]">{currentStyles.margin.left}</span>

            {/* Border Box */}
            <div className="flex-1 mx-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
              <div className="text-[9px] uppercase font-bold text-yellow-400/80 text-left mb-1">
                Border ({currentStyles.borderWidth})
              </div>

              {/* Padding Box */}
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <div className="text-[9px] uppercase font-bold text-emerald-400/80 text-left mb-1">
                  Padding
                </div>
                <div className="mb-1 text-[11px]">{currentStyles.padding.top}</div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px]">{currentStyles.padding.left}</span>

                  {/* Content Box */}
                  <div className="flex-1 mx-2 py-2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-semibold text-xs">
                    {element.bounds.width} × {element.bounds.height}
                  </div>

                  <span className="text-[11px]">{currentStyles.padding.right}</span>
                </div>

                <div className="mt-1 text-[11px]">{currentStyles.padding.bottom}</div>
              </div>
            </div>

            <span className="text-[11px]">{currentStyles.margin.right}</span>
          </div>

          <div className="mt-2 text-[11px]">{currentStyles.margin.bottom}</div>
        </div>
      </div>

      {/* Live WCAG Contrast Ratio Checker */}
      <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-neutral-200">
              WCAG 2.1 Contrast Ratio
            </h4>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded border ${
              element.contrastLevel === 'AAA'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : element.contrastLevel === 'AA'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {element.contrastLevel} Pass ({element.contrastRatio.toFixed(2)}:1)
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: currentStyles.color }}
            />
            <span className="text-neutral-300">Text: {currentStyles.color}</span>
          </div>
          <span className="text-neutral-600">vs</span>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: currentStyles.backgroundColor }}
            />
            <span className="text-neutral-300">Bg: {currentStyles.backgroundColor}</span>
          </div>
        </div>
      </div>

      {/* Style Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Typography Specs */}
        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
          <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Typography
          </h4>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-500">font-family:</span>
              <span className="text-neutral-200 truncate max-w-[160px]" title={currentStyles.fontFamily}>
                {currentStyles.fontFamily}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">font-size:</span>
              <span className="text-neutral-200">{currentStyles.fontSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">font-weight:</span>
              <span className="text-neutral-200">{currentStyles.fontWeight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">line-height:</span>
              <span className="text-neutral-200">{currentStyles.lineHeight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">letter-spacing:</span>
              <span className="text-neutral-200">{currentStyles.letterSpacing}</span>
            </div>
          </div>
        </div>

        {/* Borders & Effects */}
        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
          <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Border & Effects
          </h4>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-500">border-radius:</span>
              <span className="text-neutral-200">{currentStyles.borderRadius}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">border:</span>
              <span className="text-neutral-200">
                {currentStyles.borderWidth} {currentStyles.borderStyle}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">box-shadow:</span>
              <span className="text-neutral-200 truncate max-w-[160px]" title={currentStyles.boxShadow}>
                {currentStyles.boxShadow}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">transition:</span>
              <span className="text-neutral-200 truncate max-w-[160px]" title={currentStyles.transition}>
                {currentStyles.transition}
              </span>
            </div>
            <div className="flex justify-between gap-3"><span className="text-neutral-500">background:</span><span className="text-neutral-200 truncate" title={currentStyles.backgroundImage}>{currentStyles.backgroundImage || currentStyles.backgroundColor}</span></div>
          </div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
          <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Layout</h4>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between"><span className="text-neutral-500">display:</span><span className="text-neutral-200">{currentStyles.display}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">flex:</span><span className="text-neutral-200 truncate max-w-[180px]">{currentStyles.flexDirection || 'none'} / {currentStyles.flexWrap || 'nowrap'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">alignment:</span><span className="text-neutral-200 truncate max-w-[180px]">{currentStyles.justifyContent || 'normal'} / {currentStyles.alignItems || 'normal'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">grid:</span><span className="text-neutral-200 truncate max-w-[180px]" title={`${currentStyles.gridTemplateColumns || ''} ${currentStyles.gridTemplateRows || ''}`}>{currentStyles.gridTemplateColumns || 'none'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">gap:</span><span className="text-neutral-200">{currentStyles.gap || 'normal'}</span></div>
          </div>
        </div>
      </div>

      {element.computed.computedCss && (
        <details className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
          <summary className="cursor-pointer text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Computed CSS ({Object.keys(element.computed.computedCss).length})</summary>
          <div className="mt-3 max-h-64 overflow-auto space-y-1 text-[11px] font-mono">
            {Object.entries(element.computed.computedCss).map(([property, value]) => (
              <div key={property} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
                <span className="text-neutral-500">{property}</span><span className="text-neutral-200 break-words">{value}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Code Exporter Box */}
      <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {(['tailwind', 'css', 'jsx', 'html', 'scss'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCodeTab(tab)}
                className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-medium transition-all ${
                  codeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleCopy(getCodeSnippet(), codeTab)}
            className="h-7 px-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded text-xs font-medium flex items-center gap-1.5 border border-neutral-700/80 transition-colors shadow-sm"
          >
            {copiedFormat === codeTab ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy {codeTab.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-3 bg-neutral-950 border border-neutral-800/90 rounded-lg text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
          {getCodeSnippet()}
        </pre>
      </div>
    </div>
  );
};
