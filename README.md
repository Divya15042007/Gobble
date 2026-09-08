# Gobble

Gobble is a local design-system workbench for understanding how a website is built.
Enter a public URL to extract its title, description, favicon, colors, fonts, inline SVGs,
and image references. Gobble presents those results in a visual workspace where you can
inspect elements, sample colors, measure spacing, simulate devices, save references, and
export tokens for Tailwind, CSS, SCSS, JSX, shadcn/ui, or a downloadable bundle.

## How It Works

- Preset sites provide an instant, offline-friendly demo experience.
- The Express server fetches a public page through `POST /api/extract` and performs lightweight HTML/CSS extraction.
- The Vite-powered React client renders the extracted design system and keeps saved library items in browser local storage.
- `GET /api/proxy-asset` proxies remote images for previewing assets without browser CORS failures.

Gobble does not require a Gemini API key. Extraction is performed by the local server.

## Run Locally

**Prerequisite:** Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server includes both
the API and the Vite frontend, so one command is enough.

To use another port in PowerShell:

```powershell
$env:PORT=4173; npm run dev
```

## Production Build

```bash
npm run build
npm start
```

The build creates the client bundle and a bundled Express server in `dist/`.

## Chrome Extension

The extension build keeps the existing popup, extraction workflow, live proxy preview,
and DOM inspector. It only adds active-tab URL detection and packages the frontend as
a Manifest V3 popup.

For local unpacked testing, start the API in one terminal and build the popup in another:

```powershell
npm run dev
$env:VITE_API_URL="http://localhost:3000"
npm run build:extension
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select the generated `dist/` directory. Open a normal HTTP(S) website, click Gobble,
and the active tab URL will be populated automatically. Chrome pages such as `chrome://`
and `about:` are rejected and can still be replaced with a manual URL.

For a production package, set `VITE_API_URL` to the HTTPS origin of the deployed API and
set `CORS_ORIGINS` on the backend to the generated `chrome-extension://<extension-id>` origin.
`npm run build:extension` writes a manifest containing only the configured API host.
The build fails when `VITE_API_URL` is missing so a development localhost endpoint cannot
be shipped accidentally.

## Project Layout

- `src/App.tsx`: application state and extraction workflow
- `src/components/`: workspace, canvas, header, and feature tabs
- `src/data/presets.ts`: built-in reference design systems
- `src/utils/`: color and token export helpers
- `server.ts`: extraction API, asset proxy, and production host
