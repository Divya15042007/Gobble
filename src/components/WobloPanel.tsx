import React, { useEffect, useRef, useState } from 'react';
import {
  Palette,
  Type,
  ImageIcon,
  Search,
  Sparkles,
  Ruler,
  Smartphone,
  Package,
  Bookmark,
  X,
  Minimize2,
  Maximize2,
  Move,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ActiveTab,
  DistanceMeasurement,
  DevicePreset,
  ExtractedColor,
  ExtractedSite,
  GuideLine,
  InspectableElement,
  LibraryFolder,
  PanelPlacement,
  SavedLibraryItem,
  ToolMode
} from '../types';

import { ColorsTab } from './tabs/ColorsTab';
import { FontsTab } from './tabs/FontsTab';
import { AssetsTab } from './tabs/AssetsTab';
import { InspectTab } from './tabs/InspectTab';
import { DesignSystemTab } from './tabs/DesignSystemTab';
import { RulerTab } from './tabs/RulerTab';
import { DeviceSimulatorTab } from './tabs/DeviceSimulatorTab';
import { ExportTab } from './tabs/ExportTab';
import { LibraryTab } from './tabs/LibraryTab';

interface WobloPanelProps {
  currentSite: ExtractedSite;
  activeTab: ActiveTab;
  onSetActiveTab: (tab: ActiveTab) => void;
  panelPlacement: PanelPlacement;
  onSetPanelPlacement: (placement: PanelPlacement) => void;
  selectedElement: InspectableElement | null;
  onSelectElement: (el: InspectableElement) => void;
  eyedropperHistory: string[];
  onPickEyedropper: () => void;
  guides: GuideLine[];
  onAddGuide: (type: 'horizontal' | 'vertical') => void;
  onRemoveGuide: (id: string) => void;
  onClearGuides: () => void;
  measurements: DistanceMeasurement[];
  onClearMeasurements: () => void;
  snapToElements: boolean;
  onToggleSnap: () => void;
  isRulerActive: boolean;
  onToggleRulerActive: () => void;
  selectedDevice: DevicePreset;
  onSelectDevice: (d: DevicePreset) => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
  zoomScale: number;
  onSetZoomScale: (z: number) => void;
  showBezel: boolean;
  onToggleBezel: () => void;
  savedItems: SavedLibraryItem[];
  folders: LibraryFolder[];
  onSelectSavedSite: (site: ExtractedSite) => void;
  onRemoveLibraryItem: (id: string) => void;
  onAddFolder: (name: string) => void;
}

export const WobloPanel: React.FC<WobloPanelProps> = ({
  currentSite,
  activeTab,
  onSetActiveTab,
  panelPlacement,
  onSetPanelPlacement,
  selectedElement,
  onSelectElement,
  eyedropperHistory,
  onPickEyedropper,
  guides,
  onAddGuide,
  onRemoveGuide,
  onClearGuides,
  measurements,
  onClearMeasurements,
  snapToElements,
  onToggleSnap,
  isRulerActive,
  onToggleRulerActive,
  selectedDevice,
  onSelectDevice,
  isLandscape,
  onToggleOrientation,
  zoomScale,
  onSetZoomScale,
  showBezel,
  onToggleBezel,
  savedItems,
  folders,
  onSelectSavedSite,
  onRemoveLibraryItem,
  onAddFolder,
}) => {
  const [floatingPos, setFloatingPos] = useState({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'colors', label: 'Colors', icon: Palette, count: currentSite.colors.length },
    { id: 'fonts', label: 'Fonts', icon: Type, count: currentSite.fonts.length },
    { id: 'assets', label: 'Assets', icon: ImageIcon, count: currentSite.assets.length },
    { id: 'inspect', label: 'Inspect', icon: Search },
    { id: 'design-system', label: 'Design System', icon: Sparkles },
    { id: 'ruler', label: 'Ruler', icon: Ruler },
    { id: 'simulator', label: 'Devices', icon: Smartphone },
    { id: 'export', label: 'Export', icon: Package },
    { id: 'library', label: 'Library', icon: Bookmark, count: savedItems.length },
  ];

  const handleStartDrag = (e: React.MouseEvent) => {
    if (panelPlacement !== 'floating') return;
    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - floatingPos.x,
      y: e.clientY - floatingPos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || panelPlacement !== 'floating') return;
    setFloatingPos({
      x: Math.max(10, Math.min(window.innerWidth - 460, e.clientX - dragStartOffset.x)),
      y: Math.max(60, Math.min(window.innerHeight - 500, e.clientY - dragStartOffset.y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isFloating = panelPlacement === 'floating';

  useEffect(() => {
    const activeTabButton = tabsRef.current?.querySelector(`[data-tab-id="${activeTab}"]`);
    activeTabButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  const scrollTabs = (direction: 'left' | 'right') => {
    tabsRef.current?.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  return (
    <aside
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={
        isFloating
          ? {
              position: 'fixed',
              left: `${floatingPos.x}px`,
              top: `${floatingPos.y}px`,
              width: '460px',
              maxHeight: 'calc(100vh - 100px)',
              zIndex: 50,
            }
          : {
              width: '460px',
            }
      }
      className={`inspector-panel flex flex-col border-neutral-800 ${
        isFloating
          ? 'rounded-2xl border shadow-2xl overflow-hidden ring-1 ring-white/10'
          : 'border-l h-full overflow-hidden'
      }`}
    >
      {/* Panel Top Header Bar */}
      <div
        onMouseDown={handleStartDrag}
        className={`h-14 px-4 border-b border-neutral-800 flex items-center justify-between gap-2 select-none ${
          isFloating ? 'cursor-move' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 shrink-0"
            style={{ backgroundColor: currentSite.themeColor }}
          />
          <span className="text-sm font-bold text-white truncate">{currentSite.name}</span>
          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline truncate">
            {currentSite.url.replace('https://', '')}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSetPanelPlacement(isFloating ? 'right' : 'floating')}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            title={isFloating ? 'Dock to right' : 'Pop out floating window'}
          >
            {isFloating ? <ChevronRight className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Navigation Tab Pills */}
      <div className="panel-tabs-wrap">
        <button
          type="button"
          className="panel-tabs-arrow"
          onClick={() => scrollTabs('left')}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={tabsRef} className="panel-tabs px-2 py-2 border-b border-neutral-800/90 overflow-x-auto flex items-center gap-1 select-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onSetActiveTab(tab.id)}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
        </div>
        <button
          type="button"
          className="panel-tabs-arrow"
          onClick={() => scrollTabs('right')}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Active Tab Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'colors' && (
          <ColorsTab
            site={currentSite}
            eyedropperHistory={eyedropperHistory}
            onPickEyedropper={onPickEyedropper}
            onSelectColor={() => {}}
          />
        )}

        {activeTab === 'fonts' && <FontsTab site={currentSite} />}

        {activeTab === 'assets' && <AssetsTab site={currentSite} />}

        {activeTab === 'inspect' && (
          <InspectTab
            element={selectedElement}
            onSelectElement={onSelectElement}
            availableElements={currentSite.elements}
          />
        )}

        {activeTab === 'design-system' && <DesignSystemTab site={currentSite} />}

        {activeTab === 'ruler' && (
          <RulerTab
            guides={guides}
            onAddGuide={onAddGuide}
            onRemoveGuide={onRemoveGuide}
            onClearGuides={onClearGuides}
            measurements={measurements}
            onClearMeasurements={onClearMeasurements}
            snapToElements={snapToElements}
            onToggleSnap={onToggleSnap}
            isActive={isRulerActive}
            onToggleActive={onToggleRulerActive}
          />
        )}

        {activeTab === 'simulator' && (
          <DeviceSimulatorTab
            selectedDevice={selectedDevice}
            onSelectDevice={onSelectDevice}
            isLandscape={isLandscape}
            onToggleOrientation={onToggleOrientation}
            zoomScale={zoomScale}
            onSetZoomScale={onSetZoomScale}
            showBezel={showBezel}
            onToggleBezel={onToggleBezel}
          />
        )}

        {activeTab === 'export' && <ExportTab site={currentSite} />}

        {activeTab === 'library' && (
          <LibraryTab
            savedItems={savedItems}
            folders={folders}
            onSelectSite={onSelectSavedSite}
            onRemoveItem={onRemoveLibraryItem}
            onAddFolder={onAddFolder}
            currentSiteId={currentSite.id}
          />
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="h-7 px-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-[10px] text-neutral-500 font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Gobble workspace ready</span>
        </div>
        <div>
          <span>Press <kbd className="text-neutral-400 font-bold">Ctrl+Shift+C</kbd> to inspect</span>
        </div>
      </div>
    </aside>
  );
};
