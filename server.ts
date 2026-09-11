import express, { Request, Response } from 'express';
import path from 'path';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import { createServer as createViteServer } from 'vite';
import { extractWebsite, ExtractionError } from './server/extractionEngine';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PREVIEW_TIMEOUT_MS = 15000;
const PREVIEW_MAX_BYTES = 15 * 1024 * 1024;
const MAX_REDIRECTS = 5;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/favicon.ico', (_req: Request, res: Response) => {
  const iconRoot = process.env.NODE_ENV === 'production' ? 'dist' : 'public';
  res.sendFile(path.join(process.cwd(), iconRoot, 'icons', 'Gobble.png'));
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length === 6) {
    const num = parseInt(cleaned, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  return null;
}

// Calculate relative luminance for WCAG
function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 GobbleDesignBot/1.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (net.isIPv4(normalized)) {
    const [first, second] = normalized.split('.').map(Number);
    return first === 10 || first === 127 || first === 0 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168);
  }
  if (net.isIPv6(normalized)) {
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

async function validatePreviewUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Please provide a valid website URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP and HTTPS URLs are supported.');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') {
    throw new Error('Local and cloud metadata addresses are not allowed.');
  }
  const addresses = net.isIP(hostname) ? [hostname] : (await dns.lookup(hostname, { all: true })).map(entry => entry.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error('Private, local, and internal network addresses are not allowed.');
  }
  return url;
}

async function readBoundedBody(response: globalThis.Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > PREVIEW_MAX_BYTES) throw new Error('The preview response is too large.');
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > PREVIEW_MAX_BYTES) {
      await reader.cancel();
      throw new Error('The preview response is too large.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function previewUrl(target: URL): string {
  return `/api/preview?url=${encodeURIComponent(target.toString())}`;
}

function rewriteCss(css: string, baseUrl: URL): string {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, value) => {
    if (/^(data:|blob:|about:|#)/i.test(value)) return match;
    try {
      return `url(${quote}${previewUrl(new URL(value, baseUrl))}${quote})`;
    } catch {
      return match;
    }
  });
}

function rewriteJavaScript(source: string, baseUrl: URL): string {
  return source.replace(/(\b(?:from\s*|import\s*\(\s*|new\s+URL\s*\(\s*))(["'])([^"']+)\2/g, (match, prefix, quote, value) => {
    if (/^(data:|blob:|about:|javascript:|mailto:|tel:|#)/i.test(value)) return match;
    try {
      return `${prefix}${quote}${previewUrl(new URL(value, baseUrl))}${quote}`;
    } catch {
      return match;
    }
  });
}

function rewriteHtml(html: string, baseUrl: URL): string {
  const attributes = /\b(?:href|src|action|poster|cite|data-src|data-url)\s*=\s*(["'])(.*?)\1/gi;
  const rewritten = html.replace(attributes, (match, quote, value) => {
    if (/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(value)) return match;
    try {
      const target = new URL(value, baseUrl);
      if (!['http:', 'https:'].includes(target.protocol)) return match;
      return match.replace(value, previewUrl(target));
    } catch {
      return match;
    }
  });
  const withResponsiveImages = rewritten.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) => {
    const sources = value.split(',').map((source: string) => {
      const parts = source.trim().split(/\s+/);
      if (!parts[0] || /^(data:|blob:)/i.test(parts[0])) return source;
      try {
        parts[0] = previewUrl(new URL(parts[0], baseUrl));
      } catch {
        return source;
      }
      return parts.join(' ');
    });
    return `srcset=${quote}${sources.join(', ')}${quote}`;
  });
  const withInlineStyles = withResponsiveImages.replace(/\bstyle\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) =>
    `style=${quote}${rewriteCss(value, baseUrl)}${quote}`
  );
  const withStyles = withInlineStyles.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, start, css, end) =>
    `${start}${rewriteCss(css, baseUrl)}${end}`
  );
  const bridge = `<script data-gobble-preview-bridge>(function(){
    var targetOrigin=${JSON.stringify(baseUrl.origin)};
    var appOrigin=window.location.origin;
    var local=function(value){
      if(!value||/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(String(value)))return value;
      try{var url=new URL(value,targetOrigin);if(!/^https?:$/.test(url.protocol))return value;return '/api/preview?url='+encodeURIComponent(url.href)}catch(_){return value}
    };
    var nativeFetch=window.fetch;
    window.fetch=function(input,init){
      var method=(init&&init.method)||(input instanceof Request?input.method:'GET');
      var raw=typeof input==='string'||input instanceof URL?input.toString():input instanceof Request?input.url:'';
      if(!/^GET$|^HEAD$/i.test(method)&&raw){return Promise.resolve(new Response('',{status:204,statusText:'Preview request skipped'}));}
      if(typeof input==='string'||input instanceof URL) input=local(input.toString());
      else if(input instanceof Request) input=new Request(local(input.url),input);
      return nativeFetch.call(this,input,init);
    };
    var nativeOpen=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(method,url){if(!/^GET$|^HEAD$/i.test(method)&&url){arguments[1]='data:,';}else{arguments[1]=local(url)}return nativeOpen.apply(this,arguments)};
    ['pushState','replaceState'].forEach(function(name){var native=history[name];history[name]=function(state,title,url){if(url)arguments[2]=local(url);return native.apply(this,arguments)}});
    var inspector={enabled:false,hovered:null,selected:null,hoverOverlay:null,hoverTooltip:null,selectedOverlay:null,selectedTooltip:null};
    var cssEscape=function(value){return window.CSS&&CSS.escape?CSS.escape(value):String(value).replace(/[^a-zA-Z0-9_-]/g,'\\\\$&')};
    var selectorFor=function(element){
      if(element.id)return '#'+cssEscape(element.id);
      var parts=[];
      while(element&&element.nodeType===1&&element!==document.body&&parts.length<4){
        var part=element.tagName.toLowerCase();
        if(element.classList.length)part+='.'+Array.from(element.classList).slice(0,3).map(cssEscape).join('.');
        parts.unshift(part);element=element.parentElement;
      }
      return parts.join(' > ')||'body';
    };
    var pixel=function(value){var result=parseFloat(value);return isFinite(result)?result:0};
    var hierarchyFor=function(element){var result=[],current=element.parentElement;while(current&&result.length<12){result.unshift({tag:current.tagName.toLowerCase(),selector:selectorFor(current),id:current.id||'',classes:Array.from(current.classList)});current=current.parentElement}return result};
    var serialize=function(element){
      var rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      var edges=function(prefix){return{top:pixel(style[prefix+'Top']),right:pixel(style[prefix+'Right']),bottom:pixel(style[prefix+'Bottom']),left:pixel(style[prefix+'Left'])}};
      var background=style.backgroundColor==='rgba(0, 0, 0, 0)'?'transparent':style.backgroundColor;
      var css={};Array.from(style).forEach(function(property){css[property]=style.getPropertyValue(property)});
      var html=element.outerHTML||element.innerHTML;
      return{tag:element.tagName.toLowerCase(),selector:selectorFor(element),displayName:(element.textContent||element.tagName).trim().replace(/\\s+/g,' ').slice(0,40),role:element.getAttribute('role')||element.tagName.toLowerCase(),id:element.id||'',classes:Array.from(element.classList),attributes:Array.from(element.attributes).map(function(attribute){return{name:attribute.name,value:attribute.value}}),hierarchy:hierarchyFor(element),bounds:{top:rect.top+window.scrollY,left:rect.left+window.scrollX,x:rect.x,y:rect.y,width:rect.width,height:rect.height},computed:{color:style.color,backgroundColor:background,backgroundImage:style.backgroundImage,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,textAlign:style.textAlign,borderRadius:style.borderRadius,borderWidth:style.borderWidth,borderColor:style.borderColor,borderStyle:style.borderStyle,boxShadow:style.boxShadow,transition:style.transition,opacity:style.opacity,display:style.display,position:style.position,boxSizing:style.boxSizing,zIndex:style.zIndex,flexDirection:style.flexDirection,flexWrap:style.flexWrap,justifyContent:style.justifyContent,alignItems:style.alignItems,gap:style.gap,gridTemplateColumns:style.gridTemplateColumns,gridTemplateRows:style.gridTemplateRows,gridAutoFlow:style.gridAutoFlow,padding:edges('padding'),margin:edges('margin'),width:rect.width,height:rect.height,computedCss:css},html:html,outerHTML:html};
    };
    var send=function(type,payload){window.parent.postMessage({source:'gobble-preview-inspector',type:type,payload:payload},appOrigin)};
    var removeOverlay=function(){['hoverOverlay','hoverTooltip','selectedOverlay','selectedTooltip'].forEach(function(key){if(inspector[key])inspector[key].remove();inspector[key]=null})};
    var showOverlay=function(element,selected){
      var overlayKey=selected?'selectedOverlay':'hoverOverlay',tooltipKey=selected?'selectedTooltip':'hoverTooltip';
      if(inspector[overlayKey])inspector[overlayKey].remove();if(inspector[tooltipKey])inspector[tooltipKey].remove();if(!element)return;
      var rect=element.getBoundingClientRect();
      var overlay=document.createElement('div');overlay.setAttribute('data-gobble-inspector','true');overlay.style.cssText='position:fixed;z-index:2147483646;pointer-events:none;left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;height:'+rect.height+'px;background:'+(selected?'rgba(245,158,11,.16)':'rgba(59,130,246,.16)')+';outline:2px solid '+(selected?'#f59e0b':'#3b82f6')+';box-sizing:border-box';
      var tooltip=document.createElement('div');tooltip.setAttribute('data-gobble-inspector','true');tooltip.textContent='<'+element.tagName.toLowerCase()+'>'+(element.id?' #'+element.id:'')+(element.classList.length?' .'+Array.from(element.classList).slice(0,2).join(' .'):'')+'  '+Math.round(rect.width)+' × '+Math.round(rect.height);tooltip.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;left:'+Math.max(4,rect.left)+'px;top:'+Math.max(4,rect.top-25)+'px;background:'+(selected?'#b45309':'#1d4ed8')+';color:#fff;padding:4px 6px;border-radius:3px;font:11px monospace;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35)';
      document.documentElement.appendChild(overlay);document.documentElement.appendChild(tooltip);inspector[overlayKey]=overlay;inspector[tooltipKey]=tooltip;
    };
    var refreshOverlays=function(){if(inspector.hovered)showOverlay(inspector.hovered,false);if(inspector.selected)showOverlay(inspector.selected,true)};
    var inspectAt=function(x,y){var element=document.elementFromPoint(x,y);if(!element||element.hasAttribute('data-gobble-inspector'))return null;return element};
    var move=function(event){if(!inspector.enabled)return;var element=inspectAt(event.clientX,event.clientY);if(element!==inspector.hovered){inspector.hovered=element;showOverlay(element,false);send('hover',element?serialize(element):null)}};
    var click=function(event){if(!inspector.enabled)return;var element=inspectAt(event.clientX,event.clientY);if(!element)return;event.preventDefault();event.stopPropagation();inspector.selected=element;showOverlay(element,true);send('select',serialize(element))};
    var keydown=function(event){if(event.key==='Escape'&&inspector.enabled){inspector.enabled=false;inspector.hovered=null;inspector.selected=null;removeOverlay();document.documentElement.style.cursor='';send('mode',false)}};
    var setMode=function(enabled){inspector.enabled=!!enabled;inspector.hovered=null;if(!inspector.enabled){inspector.selected=null;removeOverlay();document.documentElement.style.cursor='';return}document.documentElement.style.cursor='crosshair'};
    document.addEventListener('mousemove',move,true);document.addEventListener('click',click,true);document.addEventListener('keydown',keydown,true);
    window.addEventListener('scroll',refreshOverlays,true);window.addEventListener('resize',refreshOverlays);
    window.addEventListener('message',function(event){if(event.origin!==appOrigin||!event.data||event.data.source!=='gobble-app')return;if(event.data.type==='set-inspect-mode')setMode(event.data.enabled)});
    var observer=new MutationObserver(function(){if(inspector.enabled&&inspector.selected&&(!inspector.selected.isConnected)){inspector.selected=null;removeOverlay();send('select',null)}});observer.observe(document.documentElement,{subtree:true,childList:true});
    send('ready',null);
  })();</script>`;
  const cleanedHtml = withStyles
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, '');
  if (/<head\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<head([^>]*)>/i, `<head$1><meta name="referrer" content="no-referrer">${bridge}`);
  }
  if (/<body\b/i.test(cleanedHtml)) return cleanedHtml.replace(/<body\b/i, `${bridge}<body`);
  if (/<html\b/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<html([^>]*)>/i, `<html$1><head><meta name="referrer" content="no-referrer">${bridge}</head>`);
  }
  return `${bridge}${cleanedHtml}`;
}

function isCertificateError(error: any): boolean {
  const code = error?.cause?.code || error?.code;
  return ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT'].includes(code);
}

function requestWithoutCertificateVerification(url: string, redirectCount = 0): Promise<{ status: number; statusText: string; text: string }> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      reject(new Error('Too many redirects while loading the website.'));
      return;
    }

    const target = new URL(url);
    const client = target.protocol === 'http:' ? http : https;
    const request = client.get(
      target,
      {
        headers: browserHeaders,
        rejectUnauthorized: false,
        timeout: 12000,
      },
      response => {
        const location = response.headers.location;
        if (location) {
          response.resume();
          void requestWithoutCertificateVerification(new URL(location, target).toString(), redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            status: response.statusCode || 502,
            statusText: response.statusMessage || '',
            text: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );

    request.on('timeout', () => request.destroy(new Error('The website took too long to respond.')));
    request.on('error', reject);
  });
}

async function fetchTargetHtml(url: string): Promise<{ status: number; statusText: string; text: string }> {
  try {
    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(12000),
    });
    return { status: response.status, statusText: response.statusText, text: await response.text() };
  } catch (error) {
    if (!isCertificateError(error)) throw error;
    console.warn(`Certificate chain rejected for ${url}; retrying the requested page with compatibility TLS.`);
    return requestWithoutCertificateVerification(url);
  }
}

// Universal live preview proxy. The browser only sees this local origin; the target is fetched server-side.
app.get('/api/preview', async (req: Request, res: Response) => {
  try {
    const requestedUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!requestedUrl) return res.status(400).send('Missing preview URL.');

    let target = await validatePreviewUrl(requestedUrl);
    let upstream: globalThis.Response | null = null;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      upstream = await fetch(target, {
        headers: {
          ...browserHeaders,
          ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
      });
      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      const location = upstream.headers.get('location');
      if (!location) break;
      target = await validatePreviewUrl(new URL(location, target).toString());
    }
    if (!upstream) throw new Error('The preview could not be loaded.');
    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      return res.status(508).send('The preview followed too many redirects.');
    }
    if (!upstream.ok) return res.status(upstream.status).send(`Target returned ${upstream.status}.`);

    const body = await readBoundedBody(upstream);
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const targetCookies = getSetCookie?.call(upstream.headers) || [];
    if (targetCookies.length) {
      res.setHeader(
        'Set-Cookie',
        targetCookies.map(cookie => cookie.replace(/;\s*Domain=[^;]+/gi, '').replace(/;\s*Path=[^;]+/gi, '; Path=/'))
      );
    }
    // These headers belong to the target origin and would prevent our local preview frame from rendering.
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    if (contentType.includes('text/html')) {
      res.send(rewriteHtml(body.toString('utf8'), target));
    } else if (contentType.includes('text/css')) {
      res.send(rewriteCss(body.toString('utf8'), target));
    } else if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
      res.send(rewriteJavaScript(body.toString('utf8'), target));
    } else {
      res.send(body);
    }
  } catch (error: any) {
    const message = error?.name === 'TimeoutError' || /timed out/i.test(error?.message || '')
      ? 'The preview website took too long to respond.'
      : error?.message || 'The preview website could not be loaded.';
    res.status(400).send(message);
  }
});

// API to extract design tokens and assets from any URL
app.post('/api/extract', async (req: Request, res: Response) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid website URL.' });
    }

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const parsedUrl = await validatePreviewUrl(url);
    const extraction = await extractWebsite(parsedUrl.toString());
    const colors = extraction.colors.values.map((color, index) => ({
      hex: color.value,
      occurrences: color.usageCount,
      rgb: color.value,
      luminance: 0,
      role: color.usage[0] || 'detected',
      id: `color-${index}`,
      evidence: color.evidence,
    }));
    return res.json({ ...extraction, title: extraction.metadata.title, description: extraction.metadata.description, favicon: extraction.metadata.favicon, rawColorCount: colors.length, colors });
  } catch (err: any) {
    console.error('Extraction error:', err);
    if (err instanceof ExtractionError) {
      const status = err.code === 'PAGE_TIMEOUT' ? 504 : err.code === 'BROWSER_EXECUTABLE_MISSING' || err.code === 'BROWSER_LAUNCH_FAILED' ? 503 : 502;
      const message = err.code === 'BROWSER_EXECUTABLE_MISSING' || err.code === 'BROWSER_LAUNCH_FAILED'
        ? 'Gobble could not start its website inspection browser. Please try again later.'
        : err.code === 'PAGE_TIMEOUT' ? 'The website took too long to respond. Check the URL and try again.' : 'Gobble could not load that website.';
      return res.status(status).json({ error: message, code: err.code, warnings: err.warnings || [] });
    }
    const causeCode = err?.cause?.code || err?.code;
    if (causeCode === 'UND_ERR_CONNECT_TIMEOUT' || /timed out/i.test(err?.message || '')) {
      return res.status(504).json({ error: 'The website took too long to respond. Check the URL and try again.' });
    }
    if (causeCode === 'ENOTFOUND') {
      return res.status(502).json({ error: 'That website could not be found. Check the domain name and try again.' });
    }
    return res.status(500).json({ error: err?.message || 'Gobble could not read that website.', warnings: err?.warnings || [] });
  }
});

// Proxy for image assets to prevent CORS issues in canvas/previews
app.get('/api/proxy-asset', async (req: Request, res: Response) => {
  try {
    const assetUrl = req.query.url as string;
    if (!assetUrl) return res.status(400).send('Missing url parameter');

    const target = await validatePreviewUrl(assetUrl);
    const fetchRes = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
    });
    if (!fetchRes.ok) return res.status(fetchRes.status).send(`Asset returned ${fetchRes.status}.`);

    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(await readBoundedBody(fetchRes));
  } catch (e: any) {
    res.status(400).send(e?.message || 'Proxy error.');
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gobble server running on http://localhost:${PORT}`);
  });
}

startServer();
