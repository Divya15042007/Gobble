import React, { useState } from 'react';
import {
  Image as ImageIcon,
  FileCode,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Sparkles,
  Package,
  Layers,
  Film
} from 'lucide-react';
import { ExtractedAsset, ExtractedSite } from '../../types';
import JSZip from 'jszip';

interface AssetsTabProps {
  site: ExtractedSite;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ site }) => {
  const [filterType, setFilterType] = useState<'all' | 'svg' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSvgModal, setSelectedSvgModal] = useState<ExtractedAsset | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDownloadSingleSvg = (asset: ExtractedAsset) => {
    if (!asset.rawSvg) return;
    const blob = new Blob([asset.rawSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.name || 'icon'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const assetsFolder = zip.folder('assets');

      for (const asset of site.assets) {
        if (asset.type === 'svg' && asset.rawSvg) {
          assetsFolder?.file(`${asset.name || 'vector'}.svg`, asset.rawSvg);
        } else if (asset.type === 'image' && asset.src) {
          try {
            const resp = await fetch(asset.src);
            const blob = await resp.blob();
            assetsFolder?.file(`${asset.name || 'image'}.${asset.format || 'png'}`, blob);
          } catch {
            // Hotlinking or cors fallback
            assetsFolder?.file(`${asset.name || 'image'}-url.txt`, asset.src);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${site.name.toLowerCase()}-assets-bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  const filteredAssets = site.assets.filter(asset => {
    if (filterType !== 'all' && asset.type !== filterType) return false;
    if (searchQuery.trim()) {
      return asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner with ZIP Export */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">
              {site.assets.length} Media & Vector Assets
            </h3>
            <p className="text-[11px] text-neutral-400">
              SVGs, icons, logos, images and animations extracted
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadAllZip}
          disabled={isZipping || site.assets.length === 0}
          className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isZipping ? 'Bundling ZIP...' : 'Download All as ZIP'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(['all', 'svg', 'image', 'video'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize shrink-0 transition-all ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {type === 'all' ? 'All Assets' : type === 'svg' ? 'SVGs & Icons' : `${type}s`}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full h-8 pl-8 pr-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Asset Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl">
          <p className="text-xs text-neutral-400">No assets matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              className="p-3 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-xl flex flex-col justify-between transition-all"
            >
              {/* Thumbnail preview */}
              <div>
                <div className="relative w-full h-28 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-center overflow-hidden p-3 pattern-checkered">
                  {asset.type === 'svg' && asset.rawSvg ? (
                    <div
                      className="w-16 h-16 flex items-center justify-center text-neutral-200 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                      dangerouslySetInnerHTML={{ __html: asset.rawSvg }}
                    />
                  ) : asset.type === 'image' ? (
                    <img
                      src={asset.src}
                      alt={asset.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-neutral-500 flex flex-col items-center gap-1">
                      <Film className="w-8 h-8" />
                      <span className="text-[10px]">Video Media</span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-neutral-900/90 text-neutral-400 border border-neutral-700/60 font-mono">
                      {asset.format || asset.type}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <h4 className="text-xs font-semibold text-neutral-200 truncate" title={asset.name}>
                    {asset.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                    {asset.dimensions && (
                      <span>
                        {asset.dimensions.width}×{asset.dimensions.height}
                      </span>
                    )}
                    {asset.sizeKb && <span>• {asset.sizeKb} KB</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-1">
                {asset.type === 'svg' && asset.rawSvg ? (
                  <>
                    <button
                      onClick={() => handleCopy(asset.rawSvg!, `svg-${asset.id}`)}
                      className="h-6 px-2 text-[10px] bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 flex items-center gap-1 transition-colors"
                      title="Copy raw SVG code"
                    >
                      {copiedId === `svg-${asset.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <FileCode className="w-3 h-3" />
                      )}
                      <span>SVG</span>
                    </button>

                    <button
                      onClick={() => {
                        const jsxCode = `export function ${asset.name.replace(/[^a-zA-Z0-9]/g, '')}Icon(props: React.SVGProps<SVGSVGElement>) {\n  return (\n    ${asset.rawSvg}\n  );\n}`;
                        handleCopy(jsxCode, `jsx-${asset.id}`);
                      }}
                      className="h-6 px-2 text-[10px] bg-neutral-950 hover:bg-neutral-800 text-indigo-400 rounded border border-neutral-800 flex items-center gap-1 transition-colors"
                      title="Copy as React JSX component"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>JSX</span>
                    </button>

                    <button
                      onClick={() => handleDownloadSingleSvg(asset)}
                      className="h-6 px-1.5 text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors"
                      title="Download SVG file"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCopy(asset.src, `url-${asset.id}`)}
                      className="h-6 px-2 text-[10px] bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>URL</span>
                    </button>

                    <a
                      href={asset.src}
                      target="_blank"
                      rel="noreferrer"
                      className="h-6 px-2 text-[10px] bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
