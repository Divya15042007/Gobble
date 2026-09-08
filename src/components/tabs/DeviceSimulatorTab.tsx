import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check
} from 'lucide-react';
import { DevicePreset } from '../../types';
import { DEVICE_PRESETS } from '../../data/presets';

interface DeviceSimulatorTabProps {
  selectedDevice: DevicePreset;
  onSelectDevice: (device: DevicePreset) => void;
  isLandscape: boolean;
  onToggleOrientation: () => void;
  zoomScale: number;
  onSetZoomScale: (zoom: number) => void;
  showBezel: boolean;
  onToggleBezel: () => void;
}

export const DeviceSimulatorTab: React.FC<DeviceSimulatorTabProps> = ({
  selectedDevice,
  onSelectDevice,
  isLandscape,
  onToggleOrientation,
  zoomScale,
  onSetZoomScale,
  showBezel,
  onToggleBezel,
}) => {
  const [activeCategory, setActiveCategory] = useState<DevicePreset['category']>('Phones');

  const categories: DevicePreset['category'][] = ['Phones', 'Tablets', 'Laptops & Desktops', 'Wearables'];
  const zoomOptions = [0.5, 0.75, 1];

  const filteredDevices = DEVICE_PRESETS.filter(d => d.category === activeCategory);

  const effectiveWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
  const effectiveHeight = isLandscape ? selectedDevice.width : selectedDevice.height;

  return (
    <div className="tool-tab device-tab space-y-6 pb-8">
      {/* Top Banner & Active Specs */}
      <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">{selectedDevice.name}</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                {effectiveWidth} × {effectiveHeight} px • {selectedDevice.dpr}x DPR • {selectedDevice.os}
              </p>
            </div>
          </div>

          <button
            onClick={onToggleOrientation}
            className="tool-action"
            title="Rotate Orientation"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
          </button>
        </div>

        {/* Zoom & Bezel Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium">Zoom:</span>
            {zoomOptions.map(z => (
              <button
                key={z}
                onClick={() => onSetZoomScale(z)}
                className={`tool-segment ${zoomScale === z ? 'is-active' : ''}`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
            <input
              type="checkbox"
              checked={showBezel}
              onChange={onToggleBezel}
              className="rounded bg-neutral-950 border-neutral-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Device Bezel Frame</span>
          </label>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`tool-segment ${activeCategory === cat ? 'is-active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredDevices.map(device => {
          const isSelected = selectedDevice.id === device.id;
          return (
            <div
              key={device.id}
              onClick={() => onSelectDevice(device)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                  : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {device.category === 'Phones' && <Smartphone className="w-3.5 h-3.5" />}
                  {device.category === 'Tablets' && <Tablet className="w-3.5 h-3.5" />}
                  {device.category === 'Laptops & Desktops' && <Laptop className="w-3.5 h-3.5" />}
                  {device.category === 'Wearables' && <Watch className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">{device.name}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {device.width} × {device.height} • {device.os}
                  </div>
                </div>
              </div>

              {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
