import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const apiUrl = process.env.VITE_API_URL?.trim();

if (!apiUrl) {
  throw new Error('VITE_API_URL is required for an extension build. Set it to the deployed API origin.');
}

const parsedApiUrl = new URL(apiUrl);
if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
  throw new Error('VITE_API_URL must use http or https.');
}

const manifest = {
  manifest_version: 3,
  name: 'Gobble Website Inspector',
  version: process.env.EXTENSION_VERSION || '1.0.0',
  description: 'Extract and inspect the design system of the website in your active tab.',
  action: {
    default_title: 'Open Gobble',
    default_popup: 'index.html',
  },
  permissions: ['activeTab'],
  host_permissions: [`${parsedApiUrl.origin}/*`],
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
};

await mkdir(dist, { recursive: true });
await readFile(path.join(root, 'public', 'manifest.json'));
await writeFile(path.join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);