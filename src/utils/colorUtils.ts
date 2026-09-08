import { ColorRamp, ColorRampStep } from '../types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return Math.round(ratio * 100) / 100;
  } catch {
    return 1;
  }
}

// Generate 11-step color ramp (50, 100, 200, ..., 900, 950)
export function generateColorRamp(name: string, baseHex: string): ColorRamp {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const stepsConfig: { step: ColorRampStep['step']; lightness: number; satMultiplier: number }[] = [
    { step: 50, lightness: 97, satMultiplier: 0.7 },
    { step: 100, lightness: 93, satMultiplier: 0.8 },
    { step: 200, lightness: 85, satMultiplier: 0.88 },
    { step: 300, lightness: 74, satMultiplier: 0.94 },
    { step: 400, lightness: 62, satMultiplier: 0.98 },
    { step: 500, lightness: hsl.l, satMultiplier: 1.0 }, // Base color
    { step: 600, lightness: Math.max(15, hsl.l * 0.82), satMultiplier: 1.02 },
    { step: 700, lightness: Math.max(12, hsl.l * 0.65), satMultiplier: 1.05 },
    { step: 800, lightness: Math.max(8, hsl.l * 0.48), satMultiplier: 1.02 },
    { step: 900, lightness: Math.max(5, hsl.l * 0.32), satMultiplier: 0.98 },
    { step: 950, lightness: Math.max(3, hsl.l * 0.18), satMultiplier: 0.95 },
  ];

  const steps: ColorRampStep[] = stepsConfig.map(cfg => {
    let hex: string;
    let stepHslString: string;

    if (cfg.step === 500) {
      hex = baseHex.toUpperCase();
      stepHslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      return { step: cfg.step, hex, hsl: stepHslString, isBase: true };
    }

    const stepSat = Math.min(100, Math.round(hsl.s * cfg.satMultiplier));
    const stepLight = Math.round(cfg.lightness);
    const stepRgb = hslToRgb(hsl.h, stepSat, stepLight);
    hex = rgbToHex(stepRgb.r, stepRgb.g, stepRgb.b);
    stepHslString = `hsl(${hsl.h}, ${stepSat}%, ${stepLight}%)`;

    return { step: cfg.step, hex, hsl: stepHslString };
  });

  return { name, baseHex: baseHex.toUpperCase(), steps };
}

export function formatColor(hex: string, format: 'hex' | 'rgb' | 'hsl' | 'tailwind' | 'css-var'): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  switch (format) {
    case 'hex':
      return hex.toUpperCase();
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'hsl':
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    case 'tailwind':
      return `bg-[${hex.toLowerCase()}]`;
    case 'css-var':
      return `var(--color-${hex.replace('#', '').toLowerCase()})`;
    default:
      return hex;
  }
}
