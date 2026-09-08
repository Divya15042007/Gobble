import JSZip from 'jszip';
import { ExtractedSite } from '../types';

export function generateTailwindV4Config(site: ExtractedSite): string {
  const brandRamp = site.colorRamps[0];
  const neutralRamp = site.colorRamps[1] || site.colorRamps[0];

  let rampCss = '';
  if (brandRamp) {
    rampCss += `  /* Brand Ramp */\n`;
    brandRamp.steps.forEach(s => {
      rampCss += `  --color-primary-${s.step}: ${s.hex};\n`;
    });
  }

  if (neutralRamp && neutralRamp !== brandRamp) {
    rampCss += `\n  /* Neutral Ramp */\n`;
    neutralRamp.steps.forEach(s => {
      rampCss += `  --color-neutral-${s.step}: ${s.hex};\n`;
    });
  }

  const primaryFont = site.fonts[0]?.family || 'Inter';

  return `@import "tailwindcss";

@theme {
  /* Gobble Extracted Design System: ${site.name} */
  --font-display: "${primaryFont}", system-ui, -apple-system, sans-serif;
  --font-sans: "${primaryFont}", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

${rampCss}
  /* Radii */
  --radius-xs: 0.25rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-subtle: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-elevation: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-floating: 0 12px 24px -4px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.1);
}
`;
}

export function generateShadcnConfig(site: ExtractedSite): { globalsCss: string; componentsJson: string } {
  const brandColor = site.colors.find(c => c.role === 'brand') || site.colors[0] || { hsl: 'hsl(245, 82%, 67%)' };
  const bgColor = site.colors.find(c => c.role === 'background') || { hsl: 'hsl(0, 0%, 100%)' };
  const textColor = site.colors.find(c => c.role === 'text') || { hsl: 'hsl(222, 47%, 11%)' };

  const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Gobble Extracted shadcn/ui Theme for ${site.name} */
    --background: ${bgColor.hsl.replace('hsl(', '').replace(')', '')};
    --foreground: ${textColor.hsl.replace('hsl(', '').replace(')', '')};
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: ${brandColor.hsl.replace('hsl(', '').replace(')', '')};
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222 47% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222 47% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: ${brandColor.hsl.replace('hsl(', '').replace(')', '')};
    --radius: 0.5rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    --popover: 224 71% 4%;
    --popover-foreground: 215 20.2% 65.1%;
    --primary: ${brandColor.hsl.replace('hsl(', '').replace(')', '')};
    --primary-foreground: 222 47% 11.2%;
    --secondary: 215 27.9% 16.9%;
    --secondary-foreground: 210 40% 98%;
    --muted: 215 27.9% 16.9%;
    --muted-foreground: 217.9 10.6% 64.9%;
    --accent: 215 27.9% 16.9%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 215 27.9% 16.9%;
    --input: 215 27.9% 16.9%;
    --ring: ${brandColor.hsl.replace('hsl(', '').replace(')', '')};
  }
}
`;

  const componentsJson = `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}`;

  return { globalsCss, componentsJson };
}

export function generateDTCGTokens(site: ExtractedSite): string {
  const brandColors: Record<string, any> = {};
  site.colors.forEach(c => {
    brandColors[c.id || c.name.toLowerCase().replace(/\s+/g, '-')] = {
      $value: c.hex,
      $type: 'color',
      $description: `${c.name} (${c.role} role, ${c.occurrences} uses)`,
      extensions: {
        hsl: c.hsl,
        rgb: c.rgb,
      },
    };
  });

  const rampsObj: Record<string, any> = {};
  site.colorRamps.forEach(ramp => {
    rampsObj[ramp.name.toLowerCase()] = {};
    ramp.steps.forEach(s => {
      rampsObj[ramp.name.toLowerCase()][s.step] = {
        $value: s.hex,
        $type: 'color',
      };
    });
  });

  const typographyObj: Record<string, any> = {};
  site.fonts.forEach(f => {
    typographyObj[f.family.toLowerCase().replace(/\s+/g, '-')] = {
      fontFamily: {
        $value: [f.family, ...f.fallbacks],
        $type: 'fontFamily',
      },
      weights: {
        $value: f.weights,
        $type: 'fontWeight',
      },
    };
  });

  const dtcg = {
    $name: `Gobble Design Tokens - ${site.name}`,
    $version: '1.0.0',
    color: {
      palette: brandColors,
      ramps: rampsObj,
    },
    typography: typographyObj,
    dimension: {
      spacing: {
        xs: { $value: '4px', $type: 'dimension' },
        sm: { $value: '8px', $type: 'dimension' },
        md: { $value: '16px', $type: 'dimension' },
        lg: { $value: '24px', $type: 'dimension' },
        xl: { $value: '32px', $type: 'dimension' },
        '2xl': { $value: '48px', $type: 'dimension' },
      },
      radius: {
        sm: { $value: '4px', $type: 'dimension' },
        md: { $value: '8px', $type: 'dimension' },
        lg: { $value: '12px', $type: 'dimension' },
        xl: { $value: '16px', $type: 'dimension' },
        full: { $value: '9999px', $type: 'dimension' },
      },
    },
  };

  return JSON.stringify(dtcg, null, 2);
}

export function generateAIPrompt(site: ExtractedSite): string {
  const brandHexes = site.colors.map(c => `- ${c.name} (${c.role}): ${c.hex} | Tailwind: \`${c.tailwindClass}\``).join('\n');
  const fontSpecs = site.fonts.map(f => `- ${f.family} (Weights: ${f.weights.join(', ')})`).join('\n');

  return `# SYSTEM PROMPT / DESIGN SYSTEM SPECIFICATION

You are implementing frontend code based strictly on the extracted design system for **${site.name}** (${site.url}).
Never hallucinate colors, arbitrary margins, or font families outside these exact specifications.

## 1. COLOR SYSTEM
${brandHexes}

### Primary 11-Step Scale
${site.colorRamps[0]?.steps.map(s => `  ${s.step}: ${s.hex}`).join('\n') || 'N/A'}

## 2. TYPOGRAPHY
${fontSpecs}

Primary Type Scale:
- Display: 48px - 64px / Tracking: -0.02em / Bold 700
- H1: 36px - 40px / Tracking: -0.02em / SemiBold 600
- H2: 28px - 32px / Tracking: -0.01em / SemiBold 600
- H3: 20px - 24px / Tracking: -0.01em / Medium 500
- Body: 15px - 16px / Line-height: 1.6 / Regular 400
- Caption: 12px - 13px / Line-height: 1.4 / Medium 500

## 3. SPACING & SHAPES
- Base grid: 4px / 8px / 16px / 24px / 32px / 48px / 64px
- Corner Radius: 8px (default cards), 6px (inputs & buttons), 9999px (pills & badges)
- Borders: 1px solid with low-opacity dark/light divider tones
- Elevation: Multi-layer soft ambient shadows with 0.05 - 0.10 opacity

## INSTRUCTIONS FOR IMPLEMENTATION:
1. Always apply these extracted tokens as utility classes or CSS custom properties.
2. Maintain high WCAG contrast compliance: adhere to AA standards for body text (4.5:1).
3. Do not introduce unrequested saturated colors or generic templates.
`;
}

export async function exportDesignSystemZip(site: ExtractedSite): Promise<Blob> {
  const zip = new JSZip();

  // Add Tailwind v4
  zip.file('tailwind-v4-theme.css', generateTailwindV4Config(site));

  // Add shadcn
  const { globalsCss, componentsJson } = generateShadcnConfig(site);
  zip.file('shadcn-globals.css', globalsCss);
  zip.file('components.json', componentsJson);

  // Add DTCG JSON
  zip.file('tokens.json', generateDTCGTokens(site));

  // Add AI Prompt
  zip.file('AI-SYSTEM-PROMPT.md', generateAIPrompt(site));

  // Add SVGs
  const svgsFolder = zip.folder('assets/svgs');
  if (svgsFolder) {
    site.assets
      .filter(a => a.type === 'svg' && a.rawSvg)
      .forEach((asset, idx) => {
        const filename = `${asset.name || `icon-${idx + 1}`}.svg`.replace(/[^a-zA-Z0-9-_\.]/g, '-');
        svgsFolder.file(filename, asset.rawSvg!);
      });
  }

  // Add HTML mockup
  zip.file('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${site.name} — Extracted by Gobble</title>
  <link rel="stylesheet" href="tailwind-v4-theme.css">
  <style>
    body { font-family: '${site.fonts[0]?.family || 'sans-serif'}', system-ui; background: ${site.colors.find(c => c.role === 'background')?.hex || '#0B0F19'}; color: ${site.colors.find(c => c.role === 'text')?.hex || '#F1F5F9'}; margin: 0; padding: 2rem; }
  </style>
</head>
<body>
  <h1>${site.name}</h1>
  <p>${site.tagline || site.description || 'Extracted Design System Bundle'}</p>
  <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 2rem 0;">
  ${site.rawHtmlSnippet || '<!-- Mockup content -->'}
</body>
</html>`);

  // Add Readme
  zip.file('README.md', `# ${site.name} — Gobble Extracted Design System Bundle

This design system package was extracted in one click using Gobble.

## Included Files:
- \`tailwind-v4-theme.css\`: Ready to copy into your Tailwind v4 project under \`@theme\`.
- \`shadcn-globals.css\` & \`components.json\`: Ready for shadcn/ui.
- \`tokens.json\`: Standard W3C DTCG design tokens for Figma, Tokens Studio, and Style Dictionary.
- \`AI-SYSTEM-PROMPT.md\`: Paste straight into Cursor, Claude Code, Copilot, or Gemini.
- \`assets/svgs/\`: Extracted vector icons and logos.
- \`index.html\`: Extracted reference page.
`);

  return await zip.generateAsync({ type: 'blob' });
}
