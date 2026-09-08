import React from 'react';
import { Ruler, Trash2, Plus, Compass } from 'lucide-react';
import { DistanceMeasurement, GuideLine } from '../../types';

interface RulerTabProps {
  guides: GuideLine[];
  onAddGuide: (type: 'horizontal' | 'vertical') => void;
  onRemoveGuide: (id: string) => void;
  onClearGuides: () => void;
  measurements: DistanceMeasurement[];
  onClearMeasurements: () => void;
  snapToElements: boolean;
  onToggleSnap: () => void;
  isActive: boolean;
  onToggleActive: () => void;
}

export const RulerTab: React.FC<RulerTabProps> = ({
  guides,
  onAddGuide,
  onRemoveGuide,
  onClearGuides,
  measurements,
  onClearMeasurements,
  snapToElements,
  onToggleSnap,
  isActive,
  onToggleActive,
}) => {
  const guideActions = [
    { type: 'horizontal' as const, label: 'Horizontal guide' },
    { type: 'vertical' as const, label: 'Vertical guide' },
  ];

  return (
    <div className="tool-tab ruler-tab space-y-6 pb-8">
      {/* Ruler Status Card */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">
              Precision Pixel Ruler & Guides
            </h3>
            <p className="text-[11px] text-neutral-400">
              Drag guides, snap to element bounding boxes, measure distances
            </p>
          </div>
        </div>

        <button
          onClick={onToggleActive}
          className={`tool-action ${isActive ? 'is-active' : ''}`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>{isActive ? 'Ruler active' : 'Enable ruler'}</span>
        </button>
      </div>

      {/* Guide Creation & Settings */}
      <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Guides & Alignment
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={snapToElements}
              onChange={onToggleSnap}
              className="rounded bg-neutral-950 border-neutral-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Snap to element edges</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {guideActions.map(action => (
            <button
              key={action.type}
              onClick={() => onAddGuide(action.type)}
              className="tool-action w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Guides List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Active Guides ({guides.length})
          </span>
          {guides.length > 0 && (
            <button
              onClick={onClearGuides}
              className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {guides.length === 0 ? (
          <div className="p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-center text-xs text-neutral-500">
            No guides created yet. Click "Add Guide" or drag from the ruler edge.
          </div>
        ) : (
          <div className="space-y-1.5">
            {guides.map(guide => (
              <div
                key={guide.id}
                className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      guide.type === 'horizontal' ? 'bg-cyan-400' : 'bg-indigo-400'
                    }`}
                  />
                  <span className="text-neutral-200 capitalize">{guide.type} Guide:</span>
                  <span className="text-neutral-400">{guide.position}px</span>
                </div>
                <button
                  onClick={() => onRemoveGuide(guide.id)}
                  className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Measurements List */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Distance Measurements ({measurements.length})
          </span>
          {measurements.length > 0 && (
            <button
              onClick={onClearMeasurements}
              className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {measurements.length === 0 ? (
          <div className="p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-center text-xs text-neutral-500">
            Click and drag between any two elements on the canvas to measure exact pixel distances.
          </div>
        ) : (
          <div className="space-y-1.5">
            {measurements.map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2 text-neutral-200">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-bold text-indigo-300">{Math.round(m.distance)}px</span>
                  <span className="text-neutral-500">
                    (dx: {Math.round(m.dx)}px, dy: {Math.round(m.dy)}px)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
