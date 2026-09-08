import React, { useState } from 'react';
import {
  Package,
  Download,
  Copy,
  Check,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  Code
} from 'lucide-react';
import { ExtractedSite } from '../../types';
import { exportDesignSystemZip } from '../../utils/tokenExporter';

interface ExportTabProps {
  site: ExtractedSite;
}

export const ExportTab: React.FC<ExportTabProps> = ({ site }) => {
  const [activeCodeView, setActiveCodeView] = useState<'html' | 'css' | 'readme'>('html');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFormat(label);
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const blob = await exportDesignSystemZip(site);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${site.name.toLowerCase()}-full-page-export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const sampleExtractedCss = `/* Gobble Extracted Design System Bundle for ${site.name} */
:root {
${site.colors.map(c => `  --color-${c.role}-${c.id}: ${c.hex};`).join('\n')}
  --font-primary: "${site.fonts[0]?.family || 'Inter'}", sans-serif;
  --radius-card: 12px;
  --radius-button: 8px;
}`;

  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${site.name} — Extracted Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${site.rawHtmlSnippet || '<!-- Clean extracted HTML components -->'}
</body>
</html>`;

  return (
    <div className="tool-tab export-tab space-y-6 pb-8">
      {/* Top Banner with Download Action */}
      <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Download Complete Page & Design Package
              </h3>
              <p className="text-xs text-neutral-400">
                Self-contained ZIP archive with HTML, CSS, SVG vectors, and design tokens
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Bundling Archive...' : 'Download Full ZIP'}</span>
          </button>
        </div>

        {/* Bundle Manifest Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-neutral-800">
          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Tokens</div>
            <div className="text-sm font-bold text-indigo-400 mt-0.5">{site.colors.length} Colors</div>
          </div>
          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Typography</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">
              {site.fonts[0]?.family || 'Inter'}
            </div>
          </div>
          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Vectors & Media</div>
            <div className="text-sm font-bold text-violet-400 mt-0.5">{site.assets.length} Assets</div>
          </div>
          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase font-semibold">Package Size</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">Standalone ZIP</div>
          </div>
        </div>
      </div>

      {/* Code Inspector Tabs */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeView('html')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                activeCodeView === 'html'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
              }`}
            >
              index.html
            </button>
            <button
              onClick={() => setActiveCodeView('css')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                activeCodeView === 'css'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
              }`}
            >
              styles.css
            </button>
          </div>

          <button
            onClick={() =>
              handleCopy(
                activeCodeView === 'html' ? sampleHtml : sampleExtractedCss,
                activeCodeView.toUpperCase()
              )
            }
            className="h-7 px-3 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 rounded text-xs font-medium flex items-center gap-1.5 border border-neutral-700/70 transition-colors"
          >
            {copiedFormat === activeCodeView.toUpperCase() ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-80 leading-relaxed">
          {activeCodeView === 'html' ? sampleHtml : sampleExtractedCss}
        </pre>
      </div>
    </div>
  );
};
