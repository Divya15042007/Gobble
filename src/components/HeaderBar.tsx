import React, { useEffect, useState } from 'react';
import {
  Globe,
  Search,
  Sparkles,
  Layers,
  Pipette,
  Ruler,
  Smartphone,
  ChevronDown,
  ExternalLink,
  PanelRight,
  PanelLeft,
  Move,
  Loader2,
  Bookmark,
  Check,
  Copy
} from 'lucide-react';
import { ExtractedSite, PanelPlacement, ToolMode } from '../types';
import { PRESET_SITES } from '../data/presets';

interface HeaderBarProps {
  currentSite: ExtractedSite;
  onSelectPreset: (preset: ExtractedSite) => void;
  onExtractUrl: (url: string) => Promise<void>;
  onNotify: (message: string) => void;
  isLoading: boolean;
  activeToolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  panelPlacement: PanelPlacement;
  onSetPanelPlacement: (placement: PanelPlacement) => void;
  onSaveToLibrary: () => void;
  isSaved: boolean;
  onOpenLibrary: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentSite,
  onSelectPreset,
  onExtractUrl,
  onNotify,
  isLoading,
  activeToolMode,
  onSetToolMode,
  panelPlacement,
  onSetPanelPlacement,
  onSaveToLibrary,
  isSaved,
  onOpenLibrary,
}) => {
  const [urlInput, setUrlInput] = useState(currentSite.url);
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setUrlInput(currentSite.url);
  }, [currentSite.url]);

  useEffect(() => {
    const extensionChrome = (globalThis as typeof globalThis & {
      chrome?: {
        tabs?: {
          query: (
            queryInfo: { active: boolean; lastFocusedWindow: boolean },
            callback: (tabs: Array<{ url?: string }>) => void,
          ) => void;
        };
      };
    }).chrome;
    if (!extensionChrome?.tabs?.query) return;

    extensionChrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      const activeUrl = tabs[0]?.url?.trim();
      if (!activeUrl) {
        onNotify('The active tab URL is unavailable. Enter a URL manually.');
        return;
      }
      if (!/^https?:\/\//i.test(activeUrl)) {
        setUrlInput('');
        onNotify('This browser page cannot be extracted. Use a normal http or https website.');
        return;
      }
      setUrlInput(activeUrl);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onExtractUrl(urlInput.trim());
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  return (
    <header className="app-header h-16 px-5 flex items-center justify-between gap-4 z-40 select-none">
      {/* Brand Logo & Tag */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onSelectPreset(PRESET_SITES[0])}>
          <div className="brand-mark w-9 h-9 rounded-xl p-[1.5px] shadow-sm">
            <img
              src="/icons/Gobble.png"
              alt="Gobble"
              className="w-full h-full rounded-[10px] object-cover"
            />
          </div>
          <div className="hidden md:flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">Gobble</span>
            </div>
            <span className="text-[10px] text-slate-300 leading-tight">Understand any website at a glance</span>
          </div>
        </div>
      </div>

      {/* URL Address & Extraction Bar */}
      <div className="flex-1 max-w-2xl mx-1 sm:mx-3">
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3 text-neutral-400 pointer-events-none">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Paste a website URL to explore its design"
              className="url-input w-full h-10 pl-9 pr-24 rounded-xl text-xs sm:text-sm focus:outline-none transition-all font-mono"
            />
            {/* Quick presets picker button */}
            <div className="absolute right-1 flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
                  className="h-7 px-2 flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg border border-white/10 transition-colors"
                  title="Choose high-fidelity demo site"
                >
                  <span>Presets</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showPresetsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 py-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10">
                      Try an example
                    </div>
                    {PRESET_SITES.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onSelectPreset(preset);
                          setUrlInput(preset.url);
                          setShowPresetsDropdown(false);
                        }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
                            currentSite.id === preset.id ? 'bg-emerald-950/40 text-emerald-300' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: preset.themeColor }}
                          />
                          <span className="text-xs font-medium">{preset.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">{preset.colors.length} colors</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="extract-button h-8 px-3 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Extract</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Mode Switchers: Inspect, Eyedropper, Ruler, Simulator */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="hidden lg:flex items-center p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg">
          <button
            onClick={() => onSetToolMode(activeToolMode === 'inspect' ? 'browse' : 'inspect')}
            className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeToolMode === 'inspect'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Inspect Element (Ctrl+Shift+C)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Inspect</span>
            <kbd className="hidden xl:inline text-[9px] px-1 py-0.2 rounded bg-black/30 text-neutral-300 border border-white/10 font-mono">
              Ctrl+Shift+C
            </kbd>
          </button>

          <button
            onClick={() => onSetToolMode(activeToolMode === 'eyedropper' ? 'browse' : 'eyedropper')}
            className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeToolMode === 'eyedropper'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Eyedropper Loupe"
          >
            <Pipette className="w-3.5 h-3.5" />
            <span>Eyedropper</span>
          </button>

          <button
            onClick={() => onSetToolMode(activeToolMode === 'ruler' ? 'browse' : 'ruler')}
            className={`h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeToolMode === 'ruler'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Ruler & Guides"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Ruler</span>
          </button>
        </div>

        {/* Save to library */}
        <button
          onClick={onSaveToLibrary}
          className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
            isSaved
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 border-neutral-700/60'
          }`}
          title="Save site to library"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Panel placement toggle: right / floating */}
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => onSetPanelPlacement('right')}
            className={`p-1.5 rounded transition-colors ${
              panelPlacement === 'right' ? 'bg-neutral-800 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Dock Panel Right"
          >
            <PanelRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSetPanelPlacement('floating')}
            className={`p-1.5 rounded transition-colors ${
              panelPlacement === 'floating' ? 'bg-neutral-800 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Floating Window"
          >
            <Move className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
