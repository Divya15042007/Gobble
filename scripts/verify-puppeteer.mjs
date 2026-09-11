import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await puppeteer.executablePath();
if (!executablePath.includes('150.0.7871.24')) {
  throw new Error(`Unexpected Puppeteer Chrome executable: ${executablePath}`);
}
await fs.access(executablePath);
await fs.mkdir(path.resolve(process.cwd(), '.cache', 'puppeteer-tmp'), { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  pipe: true,
  timeout: 30000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.goto('data:text/html,<title>Puppeteer Smoke Test</title>', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const title = await page.title();
  if (!title) throw new Error('Smoke test page did not have a title.');
  console.log(`Puppeteer verified Chrome at ${executablePath}; page title: ${title}`);
} finally {
  await browser.close();
}