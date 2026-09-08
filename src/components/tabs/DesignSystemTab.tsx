import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  FileCode,
  Layers,
  Bot,
  PackageCheck,
  Palette
} from 'lucide-react';
import { ExtractedSite } from '../../types';
import {
  generateAIPrompt,
  generateDTCGTokens,
  generateShadcnConfig,
  generateTailwindV4Config,
  exportDesignSystemZip
} from '../../utils/tokenExporter';

interface DesignSystemTabProps {
  site: ExtractedSite;
}

export const DesignSystemTab: React.FC<DesignSystemTabProps> = ({ site }) => {
  const [targetEngine, setTargetEngine] = useState<'tailwind' | 'shadcn' | 'dtcg' | 'ai'>('tailwind');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleCopy = (content: string, format: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullZip = async () => {
    setIsExportingZip(true);
    try {
      const blob = await exportDesignSystemZip(site);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${site.name.toLowerCase()}-design-system-tokens.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingZip(false);
    }
  };

  const getContentForTarget = () => {
    switch (targetEngine) {
      case 'tailwind':
        return generateTailwindV4Config(site);
      case 'shadcn':
        const { globalsCss, componentsJson } = generateShadcnConfig(site);
        return `/* --- globals.css --- */\n${globalsCss}\n\n/* --- components.json --- */\n${componentsJson}`;
      case 'dtcg':
        return generateDTCGTokens(site);
      case 'ai':
        return generateAIPrompt(site);
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">
              Export Design System Tokens
            </h3>
            <p className="text-[11px] text-neutral-400">
              Zero-guesswork tokens for Tailwind v4, shadcn/ui, Figma, or AI Agents
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadFullZip}
          disabled={isExportingZip}
          className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExportingZip ? 'Generating...' : 'Export Complete ZIP'}</span>
        </button>
      </div>

      {/* Target Engine Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setTargetEngine('tailwind')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            targetEngine === 'tailwind'
              ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
              : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-white">Tailwind v4</span>
            <FileCode className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-[11px] text-neutral-400 leading-tight">
            @theme CSS variables & color ramps
          </span>
        </button>

        <button
          onClick={() => setTargetEngine('shadcn')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            targetEngine === 'shadcn'
              ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
              : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-white">shadcn/ui</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-[11px] text-neutral-400 leading-tight">
            globals.css HSL vars + components.json
          </span>
        </button>

        <button
          onClick={() => setTargetEngine('dtcg')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            targetEngine === 'dtcg'
              ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
              : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-white">DTCG Tokens</span>
            <Palette className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[11px] text-neutral-400 leading-tight">
            W3C JSON for Figma & Tokens Studio
          </span>
        </button>

        <button
          onClick={() => setTargetEngine('ai')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            targetEngine === 'ai'
              ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
              : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-white">AI Agent Prompt</span>
            <Bot className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[11px] text-neutral-400 leading-tight">
            Paste into Claude Code, Cursor, Copilot
          </span>
        </button>
      </div>

      {/* Code Viewer & Download Box */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-neutral-300 font-mono">
            {targetEngine === 'tailwind'
              ? 'tailwind-theme.css'
              : targetEngine === 'shadcn'
              ? 'globals.css & components.json'
              : targetEngine === 'dtcg'
              ? 'tokens.json (W3C DTCG Format)'
              : 'AI-SYSTEM-PROMPT.md'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const content = getContentForTarget();
                const filename =
                  targetEngine === 'tailwind'
                    ? 'tailwind-v4-theme.css'
                    : targetEngine === 'shadcn'
                    ? 'globals.css'
                    : targetEngine === 'dtcg'
                    ? 'tokens.json'
                    : 'AI-SYSTEM-PROMPT.md';
                const mime = targetEngine === 'dtcg' ? 'application/json' : 'text/plain';
                handleDownloadFile(content, filename, mime);
              }}
              className="h-7 px-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>

            <button
              onClick={() => handleCopy(getContentForTarget(), targetEngine)}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copiedFormat === targetEngine ? (
                <>
                  <Check className="w-3 h-3 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        <pre className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed">
          {getContentForTarget()}
        </pre>
      </div>
    </div>
  );
};
