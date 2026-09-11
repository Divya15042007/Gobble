const path = require('node:path');

module.exports = {
  cacheDirectory: path.join(__dirname, '.cache', 'puppeteer'),
  temporaryDirectory: path.join(__dirname, '.cache', 'puppeteer-tmp'),
  chrome: {
    version: '150.0.7871.24',
  },
};