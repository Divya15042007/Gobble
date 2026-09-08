export type ColorRole = 'brand' | 'background' | 'text' | 'border' | 'accent' | 'gradient';

export interface ExtractedColor {
  id: string;
  hex: string;
  rgb: string;
  hsl: string;
  name: string;
  role: ColorRole;
  occurrences: number;
  contrastOnLight: number; // vs #ffffff
  contrastOnDark: number;  // vs #0f172a
  aaPassLight: boolean;
  aaaPassLight: boolean;
  aaPassDark: boolean;
  aaaPassDark: boolean;
  tailwindClass: string;
}

export interface ColorRampStep {
  step: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
  hex: string;
  hsl: string;
  isBase?: boolean;
}

export interface ColorRamp {
  name: string;
  baseHex: string;
  steps: ColorRampStep[];
}

export interface TypeScaleStep {
  label: string; // e.g., 'Display', 'H1', 'H2', 'Body Large', 'Body', 'Small'
  sizePx: number;
  rem: string;
  lineHeight: string;
  tracking: string;
  sample: string;
  tailwindClass: string;
}

export interface ExtractedFont {
  family: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display';
  weights: number[];
  sizes: TypeScaleStep[];
  fallbacks: string[];
  googleFontUrl?: string;
  sampleText: string;
}

export interface ExtractedAsset {
  id: string;
  name: string;
  type: 'svg' | 'image' | 'video' | 'lottie';
  src: string;
  rawSvg?: string;
  dimensions?: { width: number; height: number };
  format?: string;
  sizeKb?: number;
}

export interface BoxEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementStyles {
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  borderStyle: string;
  boxShadow: string;
  transition: string;
  opacity: string;
  display: string;
  position?: string;
  boxSizing?: string;
  zIndex?: string;
  backgroundImage?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
  padding: BoxEdges;
  margin: BoxEdges;
  width: number;
  height: number;
  computedCss?: Record<string, string>;
}

export interface DomAncestor {
  tag: string;
  selector: string;
  id: string;
  classes: string[];
}

export interface InspectableElement {
  id: string;
  selector: string;
  tag: string;
  displayName: string;
  role: string;
  bounds: { top: number; left: number; width: number; height: number };
  hierarchy?: DomAncestor[];
  computed: ElementStyles;
  pseudoHover?: Partial<ElementStyles>;
  pseudoFocus?: Partial<ElementStyles>;
  pseudoActive?: Partial<ElementStyles>;
  tailwindCode: string;
  cssCode: string;
  jsxCode: string;
  htmlCode: string;
  scssCode: string;
  contrastRatio: number;
  contrastLevel: 'AAA' | 'AA' | 'Fail';
  html?: string;
  outerHTML?: string;
  idAttribute?: string;
  classes?: string[];
  attributes?: { name: string; value: string }[];
}

export interface DevicePreset {
  id: string;
  name: string;
  category: 'Phones' | 'Tablets' | 'Laptops & Desktops' | 'Wearables';
  width: number;
  height: number;
  dpr: number;
  os: 'iOS' | 'Android' | 'macOS' | 'Windows' | 'watchOS';
  bezelRadius?: number;
}

export interface GuideLine {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  label?: string;
}

export interface DistanceMeasurement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  distance: number;
}

export interface ExtractedSite {
  id: string;
  url: string;
  name: string;
  tagline: string;
  description: string;
  favicon: string;
  themeColor: string;
  colors: ExtractedColor[];
  colorRamps: ColorRamp[];
  fonts: ExtractedFont[];
  assets: ExtractedAsset[];
  elements: InspectableElement[];
  rawHtmlSnippet: string;
  extractedAt: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  icon?: string;
  itemCount: number;
}

export interface SavedLibraryItem {
  id: string;
  siteId: string;
  name: string;
  url: string;
  folderId: string;
  tags: string[];
  savedAt: string;
  themeColor: string;
  colorCount: number;
  fontCount: number;
  assetCount: number;
}

export type ActiveTab =
  | 'colors'
  | 'fonts'
  | 'assets'
  | 'inspect'
  | 'design-system'
  | 'ruler'
  | 'simulator'
  | 'export'
  | 'library';

export type PanelPlacement = 'right' | 'left' | 'floating' | 'bottom';
export type ToolMode = 'browse' | 'inspect' | 'eyedropper' | 'ruler';
