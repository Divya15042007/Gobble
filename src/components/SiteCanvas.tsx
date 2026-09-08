import React, { useState, useRef, useEffect } from 'react';
import {
  DistanceMeasurement,
  DevicePreset,
  ExtractedSite,
  GuideLine,
  InspectableElement,
  ToolMode
} from '../types';
import { getContrastRatio, hexToRgb, rgbToHex } from '../utils/colorUtils';
import { apiUrl, API_ORIGIN } from '../config';

interface SiteCanvasProps {
  site: ExtractedSite;
  toolMode: ToolMode;
  selectedElement: InspectableElement | null;
  onSelectElement: (el: InspectableElement) => void;
  onExitInspect: () => void;
  selectedDevice: DevicePreset;
  isLandscape: boolean;
  zoomScale: number;
  showBezel: boolean;
  guides: GuideLine[];
  onAddGuide: (type: 'horizontal' | 'vertical', pos: number) => void;
  measurements: DistanceMeasurement[];
  onAddMeasurement: (m: DistanceMeasurement) => void;
  onSampleColor: (hex: string) => void;
}

export const SiteCanvas: React.FC<SiteCanvasProps> = ({
  site,
  toolMode,
  selectedElement,
  onSelectElement,
  onExitInspect,
  selectedDevice,
  isLandscape,
  zoomScale,
  showBezel,
  guides,
  onAddGuide,
  measurements,
  onAddMeasurement,
  onSampleColor,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hoveredElement, setHoveredElement] = useState<InspectableElement | null>(null);
  const [iframeReady, setIframeReady] = useState(0);
  const [fitScale, setFitScale] = useState(zoomScale);

  // Eyedropper Loupe state
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [eyedropperColor, setEyedropperColor] = useState<string>('#f07a5c');

  // Ruler measurement drag state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);

  const effectiveWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
  const effectiveHeight = isLandscape ? selectedDevice.width : selectedDevice.height;
  const displayScale = Math.min(zoomScale, fitScale);

  useEffect(() => {
    const handleInspectorMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== API_ORIGIN) return;
      if (!event.data || event.data.source !== 'gobble-preview-inspector') return;

      if (event.data.type === 'mode' && event.data.payload === false) {
        onExitInspect();
        return;
      }
      if (event.data.type !== 'hover' && event.data.type !== 'select') return;

      const payload = event.data.payload as {
        tag: string;
        selector: string;
        displayName: string;
        role: string;
        id: string;
        classes: string[];
        attributes: { name: string; value: string }[];
        bounds: InspectableElement['bounds'];
        computed: InspectableElement['computed'];
        html: string;
        hierarchy?: InspectableElement['hierarchy'];
      } | null;
      if (!payload) {
        if (event.data.type === 'hover') setHoveredElement(null);
        return;
      }

      const template = site.elements[0] || {
        id: '', selector: '', tag: '', displayName: '', role: '', bounds: payload.bounds,
        computed: payload.computed, tailwindCode: '', cssCode: '', jsxCode: '', htmlCode: '', scssCode: '',
        contrastRatio: 1, contrastLevel: 'Fail' as const,
      };
      const element: InspectableElement = {
        ...template,
        id: `live-${payload.selector}-${payload.bounds.left}-${payload.bounds.top}`,
        selector: payload.selector,
        tag: payload.tag,
        displayName: payload.displayName,
        role: payload.role,
        bounds: payload.bounds,
        hierarchy: payload.hierarchy,
        computed: payload.computed,
        html: payload.html,
        outerHTML: payload.html,
        idAttribute: payload.id,
        classes: payload.classes,
        attributes: payload.attributes,
        htmlCode: payload.html,
        cssCode: `${payload.selector} {\n  ${Object.entries(payload.computed).map(([key, value]) => `  ${key}: ${String(value)};`).join('\n')}\n}`,
      };
      setHoveredElement(element);
      if (event.data.type === 'select') onSelectElement(element);
    };

    window.addEventListener('message', handleInspectorMessage);
    return () => window.removeEventListener('message', handleInspectorMessage);
  }, [onExitInspect, onSelectElement, site.elements]);

  useEffect(() => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage({ source: 'gobble-app', type: 'set-inspect-mode', enabled: toolMode === 'inspect' }, API_ORIGIN);
  }, [iframeReady, toolMode]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateFitScale = () => {
      const availableWidth = Math.max(stage.clientWidth - 64, 280);
      const availableHeight = Math.max(stage.clientHeight - 64, 240);
      setFitScale(Math.min(1, availableWidth / effectiveWidth, availableHeight / effectiveHeight));
    };

    updateFitScale();
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [effectiveWidth, effectiveHeight]);

  // Track mouse coordinates for eyedropper & ruler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / displayScale);
    const y = Math.round((e.clientY - rect.top) / displayScale);

    setMousePos({ x, y });

    if (dragStart) {
      setCurrentDrag({ x, y });
    }

    if (toolMode === 'eyedropper') {
      // Sample color based on location / elements under cursor
      const el = site.elements.find(item => {
        const b = item.bounds;
        return x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height;
      });

      if (el) {
        setEyedropperColor(el.computed.backgroundColor !== 'transparent' ? el.computed.backgroundColor : el.computed.color);
      } else {
        const bg = site.colors.find(c => c.role === 'background')?.hex || '#0B0F19';
        setEyedropperColor(bg);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode === 'ruler') {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / displayScale);
      const y = Math.round((e.clientY - rect.top) / displayScale);
      setDragStart({ x, y });
      setCurrentDrag({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (toolMode === 'ruler' && dragStart && currentDrag) {
      const dx = currentDrag.x - dragStart.x;
      const dy = currentDrag.y - dragStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        onAddMeasurement({
          x1: dragStart.x,
          y1: dragStart.y,
          x2: currentDrag.x,
          y2: currentDrag.y,
          dx: Math.abs(dx),
          dy: Math.abs(dy),
          distance: dist,
        });
      }
      setDragStart(null);
      setCurrentDrag(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode === 'eyedropper') {
      onSampleColor(eyedropperColor);
    }
  };

  return (
    <div
      ref={stageRef}
      className="site-canvas relative flex-1 h-full overflow-auto flex items-center justify-center p-8 select-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Device Shell Wrapper */}
      <div
        className="transition-transform origin-center flex items-center justify-center"
        style={{
          transform: `scale(${displayScale})`,
        }}
      >
        <div
          className={`relative bg-neutral-900 shadow-2xl transition-all ${
            showBezel
              ? 'p-3.5 ring-1 ring-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]'
              : 'ring-1 ring-neutral-800'
          }`}
          style={{
            borderRadius: showBezel ? `${selectedDevice.bezelRadius || 24}px` : '8px',
          }}
        >
          {/* Bezel details for Phones/Tablets */}
          {showBezel && selectedDevice.category === 'Phones' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-neutral-950 rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 ring-1 ring-neutral-800" />
            </div>
          )}

          {/* Canvas Screen */}
          <div
            ref={containerRef}
            className="relative overflow-hidden bg-neutral-950"
            style={{
              width: `${effectiveWidth}px`,
              height: `${effectiveHeight}px`,
              borderRadius: showBezel ? `${Math.max(4, (selectedDevice.bezelRadius || 24) - 10)}px` : '6px',
            }}
          >
            <iframe
              ref={iframeRef}
              title={`Live preview of ${site.name}`}
              src={site.url ? apiUrl(`/api/preview?url=${encodeURIComponent(site.url)}`) : 'about:blank'}
              className={`live-site-frame block h-full w-full border-0 bg-white ${
                toolMode === 'inspect' ? 'cursor-crosshair' : ''
              }`}
              allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => {
                setHoveredElement(null);
                setIframeReady(value => value + 1);
              }}
            />

            {/* Ruler Guide Overlays */}
            {guides.map(guide => (
              <div
                key={guide.id}
                className={`absolute pointer-events-none z-30 ${
                  guide.type === 'horizontal'
                    ? 'w-full h-[1px] bg-cyan-400 shadow-[0_0_4px_#22D3EE]'
                    : 'h-full w-[1px] bg-indigo-400 shadow-[0_0_4px_#818CF8]'
                }`}
                style={{
                  [guide.type === 'horizontal' ? 'top' : 'left']: `${guide.position}px`,
                }}
              >
                <span className="absolute text-[9px] font-mono font-bold bg-neutral-950/90 text-cyan-300 px-1 rounded -translate-y-full">
                  {guide.position}px
                </span>
              </div>
            ))}

            {/* Active Drag Measurement Line */}
            {dragStart && currentDrag && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                <line
                  x1={dragStart.x}
                  y1={dragStart.y}
                  x2={currentDrag.x}
                  y2={currentDrag.y}
                  stroke="#F43F5E"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <circle cx={dragStart.x} cy={dragStart.y} r="4" fill="#F43F5E" />
                <circle cx={currentDrag.x} cy={currentDrag.y} r="4" fill="#F43F5E" />
                <text
                  x={(dragStart.x + currentDrag.x) / 2 + 8}
                  y={(dragStart.y + currentDrag.y) / 2 - 8}
                  fill="#FFF"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="bg-neutral-950 px-1 py-0.5"
                >
                  {Math.round(
                    Math.sqrt(
                      Math.pow(currentDrag.x - dragStart.x, 2) + Math.pow(currentDrag.y - dragStart.y, 2)
                    )
                  )}
                  px
                </text>
              </svg>
            )}

            {/* Saved Measurements */}
            {measurements.map((m, idx) => (
              <svg key={idx} className="absolute inset-0 w-full h-full pointer-events-none z-30">
                <line
                  x1={m.x1}
                  y1={m.y1}
                  x2={m.x2}
                  y2={m.y2}
                  stroke="#10B981"
                  strokeWidth="1.5"
                />
                <text
                  x={(m.x1 + m.x2) / 2 + 6}
                  y={(m.y1 + m.y2) / 2 - 6}
                  fill="#10B981"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {Math.round(m.distance)}px
                </text>
              </svg>
            ))}

            {/* Eyedropper Magnified Loupe */}
            {toolMode === 'eyedropper' && mousePos && (
              <div
                className="absolute pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${mousePos.x}px`,
                  top: `${mousePos.y}px`,
                }}
              >
                <div className="w-20 h-20 rounded-full border-2 border-white shadow-2xl overflow-hidden relative flex items-center justify-center bg-neutral-900">
                  {/* Color center dot */}
                  <div
                    className="w-full h-full ring-2 ring-white/40"
                    style={{ backgroundColor: eyedropperColor }}
                  />
                  {/* Loupe crosshair */}
                  <div className="absolute w-full h-[1px] bg-white/50" />
                  <div className="absolute h-full w-[1px] bg-white/50" />
                  <div className="absolute w-3 h-3 border border-white/90 rounded-sm" />
                </div>

                {/* Color Hex Tag */}
                <div className="mt-1 px-2 py-0.5 rounded bg-neutral-950/90 text-white font-mono text-[10px] font-bold text-center shadow-lg border border-neutral-700 whitespace-nowrap">
                  {eyedropperColor.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
