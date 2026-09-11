import puppeteer, { Browser, BrowserContext, HTTPRequest, Page } from 'puppeteer';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';

const NAVIGATION_TIMEOUT_MS = 25000;
const SETTLE_TIMEOUT_MS = 5000;
const MAX_ELEMENTS = 600;

export interface ExtractionWarning { type: string; message: string; }
export interface CanonicalExtractionResult {
  success: true; url: string;
  metadata: { title: string; description: string; favicon: string };
  page: { viewportWidth: number; viewportHeight: number; deviceScaleFactor: number; width: number; height: number; scrollWidth: number; scrollHeight: number };
  dom: { elements: RuntimeElement[]; hiddenCount: number };
  typography: { fonts: FontEvidence[]; usage: FontUsage[] };
  colors: { values: ColorEvidence[] };
  layout: { elements: RuntimeElement[]; recurringSpacing: ValueUsage[] };
  borders: { radii: ValueUsage[]; widths: ValueUsage[] };
  shadows: ValueUsage[]; assets: AssetEvidence[]; resources: ResourceEvidence[]; cssVariables: ValueUsage[];
  warnings: ExtractionWarning[]; stats: { elements: number; visibleElements: number; assets: number; resources: number; durationMs: number };
  title: string; description: string; favicon: string; fonts: string[]; images: string[]; svgs: string[];
}
interface RuntimeElement { id: string; tag: string; selector: string; role: string; text: string; attributes: { name: string; value: string }[]; visible: boolean; visibility: string; bounds: { x: number; y: number; top: number; right: number; bottom: number; left: number; width: number; height: number }; computed: Record<string, any>; html: string; }
interface FontEvidence { family: string; declaredStack: string[]; weights: number[]; sizes: string[]; evidence: string[]; confidence: number; }
interface FontUsage { family: string; weights: number[]; sizes: string[]; usageCount: number; }
interface ColorEvidence { value: string; usageCount: number; usage: string[]; evidence: string[]; }
interface ValueUsage { value: string; usageCount: number; }
export interface AssetEvidence { id: string; type: string; originalUrl: string; resolvedUrl: string; source: string; mimeType: string; width?: number; height?: number; alt?: string; isInline: boolean; isExternal: boolean; usageCount: number; rawSvg?: string; }
export interface ResourceEvidence { url: string; type: string; status?: number; mimeType?: string; size?: number; firstParty: boolean; }

let browserPromise: Promise<Browser> | undefined;
export type ExtractionErrorCode = 'BROWSER_EXECUTABLE_MISSING' | 'BROWSER_LAUNCH_FAILED' | 'NAVIGATION_FAILED' | 'PAGE_TIMEOUT' | 'EXTRACTION_FAILED';

export class ExtractionError extends Error {
  readonly warnings: ExtractionWarning[];

  constructor(public readonly code: ExtractionErrorCode, message: string, options?: { cause?: unknown; warnings?: ExtractionWarning[] }) {
    super(message, options);
    this.name = 'ExtractionError';
    this.warnings = options?.warnings || [];
  }
}
function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (net.isIPv4(normalized)) { const [first, second] = normalized.split('.').map(Number); return first === 0 || first === 10 || first === 127 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168); }
  if (net.isIPv6(normalized)) return normalized === '::' || normalized === '::1' || /^(fc|fd|fe8|fe9|fea|feb)/.test(normalized);
  return true;
}
async function assertPublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only public HTTP and HTTPS URLs are supported.');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname === 'metadata.google.internal') throw new Error('Local and cloud metadata addresses are not allowed.');
  const addresses = net.isIP(url.hostname) ? [url.hostname] : (await dns.lookup(url.hostname, { all: true })).map(entry => entry.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error('Private, local, and internal network addresses are not allowed.');
  return url;
}
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await puppeteer.executablePath();
      try {
        await fs.access(executablePath);
      } catch (error) {
        throw new ExtractionError('BROWSER_EXECUTABLE_MISSING', `Puppeteer Chrome executable is missing at ${executablePath}.`, { cause: error });
      }
      try {
        await fs.mkdir(path.resolve(process.cwd(), '.cache', 'puppeteer-tmp'), { recursive: true });
        return await puppeteer.launch({
          executablePath,
          headless: true,
          pipe: true,
          timeout: 30000,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        });
      } catch (error: any) {
        throw new ExtractionError('BROWSER_LAUNCH_FAILED', error?.message || 'Puppeteer could not launch Chrome.', { cause: error });
      }
    })();
  }
  try { return await browserPromise; } catch (error) { browserPromise = undefined; throw error; }
}
function sortedUsage(values: string[]): ValueUsage[] { const counts = new Map<string, number>(); values.filter(value => value && value !== 'none' && value !== 'normal' && value !== '0px').forEach(value => counts.set(value, (counts.get(value) || 0) + 1)); return [...counts].map(([value, usageCount]) => ({ value, usageCount })).sort((a, b) => b.usageCount - a.usageCount).slice(0, 100); }

async function inspectPage(page: Page, targetUrl: URL): Promise<any> {
  return page.evaluate(({ maxElements, targetOrigin }) => {
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
    const pixel = (value: string) => { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : 0; };
    const selector = (element: Element) => { if ((element as HTMLElement).id) return `#${CSS.escape((element as HTMLElement).id)}`; const parts: string[] = []; let current: Element | null = element; while (current && current !== document.body && parts.length < 4) { let part = current.tagName.toLowerCase(); if (current.classList.length) part += `.${[...current.classList].slice(0, 3).map(CSS.escape).join('.')}`; parts.unshift(part); current = current.parentElement; } return parts.join(' > ') || 'body'; };
    const visibleState = (style: CSSStyleDeclaration, rect: DOMRect) => { if (style.display === 'none') return 'display-none'; if (style.visibility === 'hidden') return 'hidden'; if (Number.parseFloat(style.opacity) === 0) return 'opacity-zero'; if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight + window.scrollY * 2 || rect.left > window.innerWidth + window.scrollX * 2) return 'off-screen'; return 'visible'; };
    const elements: any[] = []; let hiddenCount = 0; const spacing: string[] = []; const radii: string[] = []; const borderWidths: string[] = []; const shadows: string[] = []; const fontUses: any[] = []; const colors: any[] = [];
    const canonicalColor = (value: string) => {
      if (!value || value === 'transparent' || value === 'none') return value;
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d');
      if (!context) return value.trim().toLowerCase();
      context.fillStyle = value;
      const normalized = context.fillStyle;
      const channels = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!channels) return normalized.toLowerCase();
      if (channels[4] === '0') return 'transparent';
      return `#${[channels[1], channels[2], channels[3]].map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`;
    };
    const all = [...document.querySelectorAll('body *')];
    for (const element of all) {
      if (elements.length >= maxElements) break; if (element.hasAttribute('data-gobble-preview-bridge') || element.closest('[data-gobble-inspector]')) continue;
      const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); const state = visibleState(style, rect); const visible = state === 'visible' && rect.width > 0 && rect.height > 0; if (!visible) { hiddenCount += 1; continue; }
      const edge = (prefix: string) => ({ top: pixel(style[`${prefix}Top`]), right: pixel(style[`${prefix}Right`]), bottom: pixel(style[`${prefix}Bottom`]), left: pixel(style[`${prefix}Left`]) });
      const computed: Record<string, any> = { display: style.display, position: style.position, width: rect.width, height: rect.height, minWidth: style.minWidth, maxWidth: style.maxWidth, minHeight: style.minHeight, maxHeight: style.maxHeight, margin: edge('margin'), padding: edge('padding'), gap: style.gap, rowGap: style.rowGap, columnGap: style.columnGap, flexDirection: style.flexDirection, flexWrap: style.flexWrap, justifyContent: style.justifyContent, alignItems: style.alignItems, alignContent: style.alignContent, flex: style.flex, flexGrow: style.flexGrow, flexShrink: style.flexShrink, flexBasis: style.flexBasis, gridTemplateColumns: style.gridTemplateColumns, gridTemplateRows: style.gridTemplateRows, gridColumn: style.gridColumn, gridRow: style.gridRow, gridAutoFlow: style.gridAutoFlow, top: style.top, right: style.right, bottom: style.bottom, left: style.left, zIndex: style.zIndex, overflow: style.overflow, overflowX: style.overflowX, overflowY: style.overflowY, boxSizing: style.boxSizing, border: style.border, borderWidth: style.borderWidth, borderStyle: style.borderStyle, borderRadius: style.borderRadius, borderColor: style.borderColor, background: style.background, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, backgroundSize: style.backgroundSize, backgroundPosition: style.backgroundPosition, backgroundRepeat: style.backgroundRepeat, opacity: style.opacity, transform: style.transform, transformOrigin: style.transformOrigin, boxShadow: style.boxShadow, textShadow: style.textShadow, cursor: style.cursor, visibility: style.visibility, pointerEvents: style.pointerEvents, color: style.color, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, fontStyle: style.fontStyle, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textTransform: style.textTransform, textDecoration: style.textDecoration, fontStretch: style.fontStretch, fontVariationSettings: style.fontVariationSettings, textAlign: style.textAlign };
      const text = normalize(element.textContent || '').slice(0, 500); const attributes = [...element.attributes].filter(attribute => attribute.name.startsWith('data-') || ['id', 'class', 'role', 'aria-label', 'href', 'src', 'alt', 'name', 'type'].includes(attribute.name)).map(attribute => ({ name: attribute.name, value: attribute.value.slice(0, 500) }));
      elements.push({ id: `${elements.length}`, tag: element.tagName.toLowerCase(), selector: selector(element), role: element.getAttribute('role') || element.tagName.toLowerCase(), text, attributes, visible, visibility: state, bounds: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, top: rect.top + window.scrollY, right: rect.right + window.scrollX, bottom: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }, computed, html: (element.outerHTML || '').slice(0, 20000) });
      [computed.margin.top, computed.margin.right, computed.margin.bottom, computed.margin.left, computed.padding.top, computed.padding.right, computed.padding.bottom, computed.padding.left, pixel(style.gap), pixel(style.rowGap), pixel(style.columnGap)].filter(Boolean).forEach(value => spacing.push(`${value}px`)); radii.push(style.borderRadius); borderWidths.push(style.borderWidth); shadows.push(style.boxShadow); fontUses.push({ family: style.fontFamily, weight: Number.parseInt(style.fontWeight, 10) || 400, size: style.fontSize }); colors.push({ value: canonicalColor(style.color), usage: ['text'] }, { value: canonicalColor(style.backgroundColor), usage: ['background'] }, { value: canonicalColor(style.borderTopColor), usage: ['border'] }, { value: style.boxShadow, usage: ['shadow'] }, { value: style.textShadow, usage: ['text-shadow'] }, { value: style.backgroundImage, usage: ['gradient'] });
    }
    const variables: any[] = []; for (const sheet of [...document.styleSheets]) { try { for (const rule of [...sheet.cssRules]) if (rule instanceof CSSStyleRule) for (const name of [...rule.style]) if (name.startsWith('--')) variables.push({ value: `${name}=${rule.style.getPropertyValue(name).trim()}` }); } catch { /* cross-origin stylesheet */ } }
    const fonts = [...document.fonts].map(font => ({ family: font.family.replace(/^['"]|['"]$/g, ''), style: font.style, weight: font.weight, stretch: font.stretch, status: font.status })); const assets: any[] = []; const seen = new Set<string>(); const addAsset = (asset: any) => { if (assets.length >= 300 || seen.has(asset.resolvedUrl)) return; seen.add(asset.resolvedUrl); assets.push(asset); };
    document.querySelectorAll('img,source,video,audio,link[rel*="icon"],link[rel="preload"]').forEach((element: Element) => { const node = element as HTMLImageElement; const value = node.currentSrc || node.src || node.getAttribute('href') || node.getAttribute('src'); if (!value) return; const resolvedUrl = new URL(value, location.href).href; addAsset({ type: element.tagName.toLowerCase() === 'img' ? 'image' : element.tagName.toLowerCase(), originalUrl: value, resolvedUrl, source: element.tagName.toLowerCase(), mimeType: '', width: node.naturalWidth || undefined, height: node.naturalHeight || undefined, alt: node.getAttribute('alt') || undefined, isInline: false, isExternal: new URL(resolvedUrl).origin !== targetOrigin, usageCount: 1 }); });
    document.querySelectorAll('svg').forEach((element: Element) => addAsset({ type: 'svg', originalUrl: '', resolvedUrl: `${location.href}#inline-svg-${assets.length}`, source: 'inline-svg', mimeType: 'image/svg+xml', width: pixel(getComputedStyle(element).width), height: pixel(getComputedStyle(element).height), isInline: true, isExternal: false, usageCount: 1, rawSvg: (element.outerHTML || '').slice(0, 30000) }));
    for (const element of all) { const image = getComputedStyle(element).backgroundImage; if (image && image !== 'none') for (const match of image.matchAll(/url\((['"]?)(.*?)\1\)/g)) { try { const resolvedUrl = new URL(match[2], location.href).href; addAsset({ type: 'image', originalUrl: match[2], resolvedUrl, source: 'background-image', mimeType: '', isInline: match[2].startsWith('data:'), isExternal: new URL(resolvedUrl).origin !== targetOrigin, usageCount: 1 }); } catch { /* malformed CSS URL */ } } }
    return { title: document.title, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '', favicon: document.querySelector('link[rel*="icon"]')?.getAttribute('href') || '', elements, hiddenCount, spacing, radii, borderWidths, shadows, fontUses, colors, fonts, assets, variables, dimensions: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight } };
  }, { maxElements: MAX_ELEMENTS, targetOrigin: targetUrl.origin });
}

export async function extractWebsite(input: string): Promise<CanonicalExtractionResult> {
  const startedAt = Date.now();
  const requested = await assertPublicUrl(input);
  const warnings: ExtractionWarning[] = [];
  const resources = new Map<string, ResourceEvidence>();
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    const browser = await getBrowser();
    context = await browser.createBrowserContext();
    const extractionPage = page = await context.newPage();

    await extractionPage.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await extractionPage.setRequestInterception(true);
    extractionPage.on('request', async (request: HTTPRequest) => {
      try {
        await assertPublicUrl(request.url());
        await request.continue();
      } catch {
        await request.abort('blockedbyclient').catch(() => undefined);
      }
    });
    extractionPage.on('response', response => {
      const url = response.url();
      if (!resources.has(url)) {
        resources.set(url, {
          url,
          type: response.request().resourceType(),
          status: response.status(),
          mimeType: response.headers()['content-type'],
          firstParty: new URL(url).origin === requested.origin,
        });
      }
    });

    try {
      await extractionPage.goto(requested.toString(), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error: any) {
      const code = error?.name === 'TimeoutError' ? 'PAGE_TIMEOUT' : 'NAVIGATION_FAILED';
      throw new ExtractionError(code, error?.message || 'The website could not be loaded.', { cause: error });
    }
    await extractionPage.waitForNetworkIdle({ idleTime: 500, timeout: SETTLE_TIMEOUT_MS }).catch(() => warnings.push({ type: 'NETWORK_IDLE_TIMEOUT', message: 'The page did not become network-idle before extraction.' })); await extractionPage.evaluate(async () => { await (document as any).fonts?.ready; });
    const inspected = await inspectPage(extractionPage, requested); const finalUrl = await extractionPage.url(); await assertPublicUrl(finalUrl); const finalOrigin = new URL(finalUrl).origin;
    const colorMap = new Map<string, ColorEvidence>(); for (const item of inspected.colors) { if (!item.value || item.value === 'transparent' || item.value === 'none') continue; const key = item.value.trim().toLowerCase(); const existing = colorMap.get(key); if (existing) { existing.usageCount += 1; existing.usage.push(...item.usage); } else colorMap.set(key, { value: key, usageCount: 1, usage: [...item.usage], evidence: ['computed-style'] }); }
    const fontMap = new Map<string, FontEvidence>(); const usageMap = new Map<string, FontUsage>(); for (const use of inspected.fontUses) { const stack = String(use.family).split(',').map((family: string) => family.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean); const family = stack[0]; if (!family) continue; const font = fontMap.get(family) || { family, declaredStack: stack, weights: [], sizes: [], evidence: ['computed-style'], confidence: 0.6 }; if (!font.weights.includes(use.weight)) font.weights.push(use.weight); if (!font.sizes.includes(use.size)) font.sizes.push(use.size); fontMap.set(family, font); const usage = usageMap.get(family) || { family, weights: [], sizes: [], usageCount: 0 }; usage.usageCount += 1; if (!usage.weights.includes(use.weight)) usage.weights.push(use.weight); if (!usage.sizes.includes(use.size)) usage.sizes.push(use.size); usageMap.set(family, usage); }
    for (const font of inspected.fonts) { const existing = fontMap.get(font.family); if (existing) { existing.evidence.push('document-fonts'); existing.confidence = Math.min(1, existing.confidence + 0.25); } }
    const assets: AssetEvidence[] = inspected.assets.map((asset: AssetEvidence, index: number) => ({ ...asset, id: `asset-${index}`, resolvedUrl: asset.resolvedUrl || finalUrl, isExternal: asset.isExternal || (asset.resolvedUrl ? new URL(asset.resolvedUrl).origin !== finalOrigin : false) }));
    return { success: true, url: finalUrl, metadata: { title: inspected.title || requested.hostname, description: inspected.description, favicon: inspected.favicon ? new URL(inspected.favicon, finalUrl).href : `${new URL(finalUrl).origin}/favicon.ico` }, page: { viewportWidth: 1440, viewportHeight: 1000, deviceScaleFactor: 1, width: inspected.dimensions.width, height: inspected.dimensions.height, scrollWidth: inspected.dimensions.scrollWidth, scrollHeight: inspected.dimensions.scrollHeight }, dom: { elements: inspected.elements, hiddenCount: inspected.hiddenCount }, typography: { fonts: [...fontMap.values()], usage: [...usageMap.values()] }, colors: { values: [...colorMap.values()] }, layout: { elements: inspected.elements, recurringSpacing: sortedUsage(inspected.spacing) }, borders: { radii: sortedUsage(inspected.radii), widths: sortedUsage(inspected.borderWidths) }, shadows: sortedUsage(inspected.shadows), assets, resources: [...resources.values()], cssVariables: sortedUsage(inspected.variables.map((item: any) => item.value)), warnings, stats: { elements: inspected.elements.length + inspected.hiddenCount, visibleElements: inspected.elements.length, assets: assets.length, resources: resources.size, durationMs: Date.now() - startedAt }, title: inspected.title || requested.hostname, description: inspected.description, favicon: inspected.favicon ? new URL(inspected.favicon, finalUrl).href : `${new URL(finalUrl).origin}/favicon.ico`, fonts: [...fontMap.keys()], images: assets.filter(asset => asset.type === 'image').map(asset => asset.resolvedUrl), svgs: assets.filter(asset => asset.type === 'svg' && asset.rawSvg).map(asset => asset.rawSvg as string) };
  } catch (error: any) {
    const extractionError = error instanceof ExtractionError ? error : new ExtractionError('EXTRACTION_FAILED', error?.message || 'The page could not be extracted.', { cause: error });
    warnings.push({ type: extractionError.code, message: extractionError.message });
    throw new ExtractionError(extractionError.code, extractionError.message, { cause: extractionError, warnings });
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
  }
}