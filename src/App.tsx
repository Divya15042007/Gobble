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

      const extracted: ExtractedSite = {
        id: `extracted-${Date.now()}`,
        url: data.url,
        name: data.metadata?.title || new URL(data.url).hostname,
        tagline: data.metadata?.description || 'Live website preview',
        description: data.metadata?.description || '',
        favicon: data.metadata?.favicon || '',
        themeColor: '', colors: [], colorRamps: [], fonts: [], assets: [], elements: [], rawHtmlSnippet: '',
        extractedAt: new Date().toISOString(),
      };

      const canonicalElements: InspectableElement[] = (data.dom?.elements || []).map((element: any) => {
        const computed = element.computed || {};
        const edges = (value: any) => value || { top: 0, right: 0, bottom: 0, left: 0 };
        return {
          id: element.id,
          selector: element.selector,
          tag: element.tag,
          displayName: element.text || element.tag,
          role: element.role,
          bounds: { top: element.bounds.top, left: element.bounds.left, width: element.bounds.width, height: element.bounds.height },
          computed: {
            ...computed,
            color: computed.color || '',
            backgroundColor: computed.backgroundColor || '',
            fontFamily: computed.fontFamily || '',
            fontSize: computed.fontSize || '',
            fontWeight: computed.fontWeight || '',
            lineHeight: computed.lineHeight || '',
            letterSpacing: computed.letterSpacing || '',
            textAlign: computed.textAlign || '',
            borderRadius: computed.borderRadius || '',
            borderWidth: computed.borderWidth || '',
            borderColor: computed.borderColor || '',
            borderStyle: computed.borderStyle || '',
            boxShadow: computed.boxShadow || '',
            transition: computed.transition || '',
            opacity: computed.opacity || '',
            display: computed.display || '',
            padding: edges(computed.padding),
            margin: edges(computed.margin),
            width: element.bounds.width,
            height: element.bounds.height,
          },
          tailwindCode: '', cssCode: '', jsxCode: '', htmlCode: element.html || '', scssCode: '',
          contrastRatio: 0, contrastLevel: 'Fail', html: element.html, outerHTML: element.html,
          idAttribute: element.attributes?.find((attribute: any) => attribute.name === 'id')?.value,
          classes: element.attributes?.find((attribute: any) => attribute.name === 'class')?.value?.split(/\s+/).filter(Boolean),
          attributes: element.attributes,
        };
      });
      extracted.elements = canonicalElements;
      extracted.colors = (data.colors || []).map((color: any, idx: number) => ({
        id: `col-${idx}`, hex: color.hex, rgb: color.hex, hsl: '', name: color.hex,
        role: 'accent', occurrences: color.occurrences, contrastOnLight: 0, contrastOnDark: 0,
        aaPassLight: false, aaaPassLight: false, aaPassDark: false, aaaPassDark: false, tailwindClass: '',
      }));
      extracted.colorRamps = data.colors?.[0]?.hex ? [generateColorRamp('Detected', data.colors[0].hex)] : [];
      extracted.themeColor = data.colors?.[0]?.hex || '';
      extracted.fonts = (data.typography?.fonts || []).map((font: any) => ({
        family: font.family, category: 'sans-serif', weights: font.weights || [], fallbacks: font.declaredStack?.slice(1) || [],
        sizes: (data.typography.usage?.find((usage: any) => usage.family === font.family)?.sizes || []).map((size: string) => ({ label: size, sizePx: Number.parseFloat(size) || 0, rem: `${(Number.parseFloat(size) || 0) / 16}rem`, lineHeight: '', tracking: '', sample: '', tailwindClass: '' })),
        sampleText: canonicalElements.find(element => element.computed.fontFamily.includes(font.family))?.displayName || '',
      }));
      extracted.assets = (data.assets || []).map((asset: any) => ({ id: asset.id, name: asset.originalUrl || asset.type, type: asset.type === 'svg' ? 'svg' : asset.type === 'image' ? 'image' : 'video', src: asset.isInline && asset.rawSvg ? `data:image/svg+xml;utf8,${encodeURIComponent(asset.rawSvg)}` : asset.resolvedUrl, rawSvg: asset.rawSvg, dimensions: asset.width && asset.height ? { width: asset.width, height: asset.height } : undefined, format: asset.mimeType || asset.type }));
      extracted.rawHtmlSnippet = canonicalElements[0]?.html || '';
      setCurrentSite(extracted);
      setSelectedElement(canonicalElements[0] || null);
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
