import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  DistanceMeasurement,
  DevicePreset,
  ExtractedSite,
  GuideLine,
  InspectableElement,
  LibraryFolder,
  PanelPlacement,
  SavedLibraryItem,
  ToolMode
} from './types';

import {
  DEVICE_PRESETS,
  INITIAL_LIBRARY_FOLDERS,
  INITIAL_SAVED_ITEMS,
  PRESET_SITES
} from './data/presets';
import { generateColorRamp, hexToRgb } from './utils/colorUtils';
import { apiUrl } from './config';
import { HeaderBar } from './components/HeaderBar';
import { SiteCanvas } from './components/SiteCanvas';
import { WobloPanel } from './components/WobloPanel';

const EMPTY_SITE: ExtractedSite = {
  id: 'empty-workspace',
  url: '',
  name: 'New workspace',
  tagline: 'Your design preview will appear here',
  description: 'Paste a website URL above to inspect its colors, type, assets, and reusable design tokens.',
  favicon: '',
  themeColor: '#f07a5c',
  colors: [],
  colorRamps: [],
  fonts: [],
  assets: [],
  elements: [],
  rawHtmlSnippet: '',
  extractedAt: '',
};

export default function App() {
  const [currentSite, setCurrentSite] = useState<ExtractedSite>(EMPTY_SITE);
  const [activeTab, setActiveTab] = useState<ActiveTab>('colors');
  const [toolMode, setToolMode] = useState<ToolMode>('inspect');
  const [panelPlacement, setPanelPlacement] = useState<PanelPlacement>('right');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Selected Inspect Element
  const [selectedElement, setSelectedElement] = useState<InspectableElement | null>(null);

  // Eyedropper history
  const [eyedropperHistory, setEyedropperHistory] = useState<string[]>([]);

  // Ruler guides & measurements
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [measurements, setMeasurements] = useState<DistanceMeasurement[]>([]);
  const [snapToElements, setSnapToElements] = useState(true);

  // Device Simulator state
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(
    DEVICE_PRESETS.find(d => d.id === 'desktop-1080p') || DEVICE_PRESETS[0]
  );
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoomScale, setZoomScale] = useState(0.85);
  const [showBezel, setShowBezel] = useState(false);

  // Library & Folders state
  const [savedItems, setSavedItems] = useState<SavedLibraryItem[]>(() => {
    const cached = localStorage.getItem('gobble_saved_items');
    return cached ? JSON.parse(cached) : INITIAL_SAVED_ITEMS;
  });
  const [folders, setFolders] = useState<LibraryFolder[]>(INITIAL_LIBRARY_FOLDERS);

  // Sync saved items to localStorage
  useEffect(() => {
    localStorage.setItem('gobble_saved_items', JSON.stringify(savedItems));
  }, [savedItems]);

  // Global keyboard shortcut: Ctrl+Shift+C to toggle inspect mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setToolMode(prev => (prev === 'inspect' ? 'browse' : 'inspect'));
        if (toolMode !== 'inspect') {
          setActiveTab('inspect');
        }
        showToast('Inspect Mode Toggled');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toolMode]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Live URL Extraction Handler
  const handleExtractUrl = async (urlToExtract: string) => {
    const normalizedUrl = /^https?:\/\//i.test(urlToExtract) ? urlToExtract : `https://${urlToExtract}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      showToast('Enter a valid http or https URL.');
      return;
    }

    // Set the address immediately so the exact page can still open when its metadata blocks extraction.
    setCurrentSite(prev => ({
      ...prev,
      url: parsedUrl.toString(),
      name: parsedUrl.hostname,
      tagline: 'Live website preview',
      description: 'The original website is loaded directly in the preview canvas.',
    }));
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/extract'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToExtract }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();

      // Transform response to ExtractedSite
      const brandColor = data.colors[0]?.hex || '#6366F1';
      const ramps = [generateColorRamp('Primary Brand', brandColor)];

      const extracted: ExtractedSite = {
        id: `extracted-${Date.now()}`,
        url: data.url,
        name: data.title || new URL(data.url).hostname,
        tagline: data.description || `Design system extracted from ${data.url}`,
        description: data.description || '',
        favicon: data.favicon || '',
        themeColor: brandColor,
        colors: data.colors.map((c: any, idx: number) => ({
          id: `col-${idx}`,
          hex: c.hex,
          rgb: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
          hsl: `hsl(210, 50%, 50%)`,
          name: `Color ${c.hex.toUpperCase()}`,
          role: c.role,
          occurrences: c.occurrences,
          contrastOnLight: 4.5,
          contrastOnDark: 7.2,
          aaPassLight: true,
          aaaPassLight: false,
          aaPassDark: true,
          aaaPassDark: true,
          tailwindClass: `bg-[${c.hex.toLowerCase()}]`,
        })),
        colorRamps: ramps,
        fonts: (data.fonts.length > 0 ? data.fonts : ['Inter']).map((f: string) => ({
          family: f,
          category: 'sans-serif',
          weights: [400, 500, 600, 700],
          fallbacks: ['system-ui', 'sans-serif'],
          sizes: [
            { label: 'Display Hero', sizePx: 56, rem: '3.5rem', lineHeight: '1.1', tracking: '-0.02em', sample: 'Extracted Display Typography', tailwindClass: 'text-5xl font-bold tracking-tight' },
            { label: 'H1 Headline', sizePx: 38, rem: '2.375rem', lineHeight: '1.2', tracking: '-0.015em', sample: 'Section Headline', tailwindClass: 'text-4xl font-semibold' },
            { label: 'Body Regular', sizePx: 16, rem: '1rem', lineHeight: '1.6', tracking: '0em', sample: 'Body content typography.', tailwindClass: 'text-base' },
          ],
          sampleText: 'Design system extracted live by Gobble.',
        })),
        assets: [
          ...data.svgs.map((svg: string, idx: number) => ({
            id: `svg-${idx}`,
            name: `vector-asset-${idx + 1}`,
            type: 'svg' as const,
            src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
            rawSvg: svg,
            format: 'svg',
            sizeKb: Math.round(svg.length / 1024 * 10) / 10,
          })),
          ...data.images.map((imgUrl: string, idx: number) => ({
            id: `img-${idx}`,
            name: `extracted-image-${idx + 1}`,
            type: 'image' as const,
            src: imgUrl,
            format: 'image',
            sizeKb: 45,
          })),
        ],
        elements: [
          {
            id: 'el-extracted-root',
            selector: '.site-hero-cta',
            tag: 'button',
            displayName: 'Primary Action CTA',
            role: 'button',
            bounds: { top: 320, left: 160, width: 200, height: 44 },
            computed: {
              color: '#FFFFFF',
              backgroundColor: brandColor,
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              fontWeight: '600',
              lineHeight: '1.2',
              letterSpacing: '-0.01em',
              textAlign: 'center',
              borderRadius: '8px',
              borderWidth: '1px',
              borderColor: 'transparent',
              borderStyle: 'solid',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              transition: 'all 150ms ease',
              opacity: '1',
              display: 'inline-flex',
              padding: { top: 12, right: 24, bottom: 12, left: 24 },
              margin: { top: 20, right: 0, bottom: 0, left: 0 },
              width: 200,
              height: 44,
            },
            tailwindCode: `inline-flex items-center px-6 py-3 rounded-lg text-[15px] font-semibold text-white bg-[${brandColor.toLowerCase()}] shadow-lg`,
            cssCode: `.site-hero-cta {\n  display: inline-flex;\n  padding: 12px 24px;\n  background-color: ${brandColor};\n  color: #fff;\n  border-radius: 8px;\n}`,
            jsxCode: `<button className="px-6 py-3 rounded-lg bg-[${brandColor.toLowerCase()}] text-white font-semibold shadow-lg">\n  Get Started\n</button>`,
            htmlCode: `<button class="site-hero-cta">Get Started</button>`,
            scssCode: `$brand: ${brandColor};\n.site-hero-cta { background: $brand; padding: 12px 24px; }`,
            contrastRatio: 5.2,
            contrastLevel: 'AA',
          },
        ],
        rawHtmlSnippet: `<div class="extracted-page">\n  <h1>${data.title}</h1>\n  <p>${data.description}</p>\n</div>`,
        extractedAt: new Date().toISOString(),
      };

      setCurrentSite(extracted);
      setSelectedElement(extracted.elements[0] || null);
      showToast(`Extracted ${extracted.colors.length} colors & ${extracted.assets.length} assets!`);
    } catch (err: any) {
      console.error(err);
      showToast(`${err.message || 'Metadata extraction failed.'} The live page will still load if it allows embedding.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample Color via Eyedropper
  const handleSampleColor = (hex: string) => {
    setEyedropperHistory(prev => [hex, ...prev.filter(h => h.toLowerCase() !== hex.toLowerCase())].slice(0, 12));
    navigator.clipboard.writeText(hex);
    showToast(`Sampled & copied ${hex} to clipboard!`);
  };

  // Save / Bookmark current site to library
  const isCurrentSiteSaved = savedItems.some(item => item.url === currentSite.url);
  const handleToggleSaveToLibrary = () => {
    if (isCurrentSiteSaved) {
      setSavedItems(prev => prev.filter(item => item.url !== currentSite.url));
      showToast('Removed from saved library');
    } else {
      const newItem: SavedLibraryItem = {
        id: `save-${Date.now()}`,
        siteId: currentSite.id,
        name: currentSite.name,
        url: currentSite.url,
        folderId: 'f-all',
        tags: [currentSite.name, currentSite.fonts[0]?.family || 'Sans', 'Extracted'],
        savedAt: new Date().toISOString(),
        themeColor: currentSite.themeColor,
        colorCount: currentSite.colors.length,
        fontCount: currentSite.fonts.length,
        assetCount: currentSite.assets.length,
      };
      setSavedItems(prev => [newItem, ...prev]);
      showToast(`Saved ${currentSite.name} to library!`);
    }
  };

  return (
    <div className="app-shell flex flex-col h-screen w-screen overflow-hidden text-neutral-100 font-sans">
      {/* Top Application Header */}
      <HeaderBar
        currentSite={currentSite}
        onSelectPreset={preset => {
          setCurrentSite(preset);
          setSelectedElement(preset.elements[0] || null);
          showToast(`Loaded ${preset.name} design system`);
        }}
        onExtractUrl={handleExtractUrl}
        onNotify={showToast}
        isLoading={isLoading}
        activeToolMode={toolMode}
        onSetToolMode={mode => {
          setToolMode(mode);
          if (mode === 'inspect') setActiveTab('inspect');
          if (mode === 'ruler') setActiveTab('ruler');
          if (mode === 'eyedropper') setActiveTab('colors');
        }}
        panelPlacement={panelPlacement}
        onSetPanelPlacement={setPanelPlacement}
        onSaveToLibrary={handleToggleSaveToLibrary}
        isSaved={isCurrentSiteSaved}
        onOpenLibrary={() => setActiveTab('library')}
      />

      {/* Main Workspace Stage */}
      <div className="workspace-stage flex-1 flex overflow-hidden relative">
        {/* Center Site Simulation & Inspection Canvas */}
        <SiteCanvas
          site={currentSite}
          toolMode={toolMode}
          selectedElement={selectedElement}
          onSelectElement={el => {
            setSelectedElement(el);
            setActiveTab('inspect');
          }}
          onExitInspect={() => setToolMode('browse')}
          selectedDevice={selectedDevice}
          isLandscape={isLandscape}
          zoomScale={zoomScale}
          showBezel={showBezel}
          guides={guides}
          onAddGuide={(type, pos) => {
            setGuides(prev => [...prev, { id: `g-${Date.now()}`, type, position: pos }]);
          }}
          measurements={measurements}
          onAddMeasurement={m => setMeasurements(prev => [...prev, m])}
          onSampleColor={handleSampleColor}
        />

        {/* Gobble side panel or floating inspector */}
        <WobloPanel
          currentSite={currentSite}
          activeTab={activeTab}
          onSetActiveTab={setActiveTab}
          panelPlacement={panelPlacement}
          onSetPanelPlacement={setPanelPlacement}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          eyedropperHistory={eyedropperHistory}
          onPickEyedropper={() => {
            setToolMode('eyedropper');
            showToast('Click anywhere on the preview to sample pixel colors');
          }}
          guides={guides}
          onAddGuide={type => {
            const pos = type === 'horizontal' ? 240 : 280;
            setGuides(prev => [...prev, { id: `g-${Date.now()}`, type, position: pos }]);
          }}
          onRemoveGuide={id => setGuides(prev => prev.filter(g => g.id !== id))}
          onClearGuides={() => setGuides([])}
          measurements={measurements}
          onClearMeasurements={() => setMeasurements([])}
          snapToElements={snapToElements}
          onToggleSnap={() => setSnapToElements(prev => !prev)}
          isRulerActive={toolMode === 'ruler'}
          onToggleRulerActive={() => setToolMode(prev => (prev === 'ruler' ? 'browse' : 'ruler'))}
          selectedDevice={selectedDevice}
          onSelectDevice={d => {
            setSelectedDevice(d);
            setShowBezel(d.category === 'Phones' || d.category === 'Tablets');
          }}
          isLandscape={isLandscape}
          onToggleOrientation={() => setIsLandscape(prev => !prev)}
          zoomScale={zoomScale}
          onSetZoomScale={setZoomScale}
          showBezel={showBezel}
          onToggleBezel={() => setShowBezel(prev => !prev)}
          savedItems={savedItems}
          folders={folders}
          onSelectSavedSite={site => {
            setCurrentSite(site);
            setSelectedElement(site.elements[0] || null);
            setActiveTab('colors');
          }}
          onRemoveLibraryItem={id => setSavedItems(prev => prev.filter(i => i.id !== id))}
          onAddFolder={name => {
            const newF: LibraryFolder = {
              id: `f-${Date.now()}`,
              name,
              itemCount: 0,
            };
            setFolders(prev => [...prev, newF]);
          }}
        />
      </div>

      {/* Global Notification Toast */}
      {notification && (
        <div className="toast fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 text-neutral-100 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
