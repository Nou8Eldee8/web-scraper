// runAutozorg.js
const scrapeAllCategories = require('./puppeteerScraper');

const storeUrl = 'https://www.autozorg.org/store';
scrapeAllCategories(storeUrl);