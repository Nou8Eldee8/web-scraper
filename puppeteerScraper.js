import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = "https://www.autozorg.org/store/";

const discoverCategoryLinks = async (page) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const categoryLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(a => a.href)
      .filter(href =>
        href.includes('/store/') &&
        !href.includes('/account') &&
        !href.includes('/cart') &&
        !href.includes('/search') &&
        !href.includes('#') &&
        !href.endsWith('/store/')
      );
  });

  // حذف التكرارات
  return Array.from(new Set(categoryLinks));
};

const scrapeCategory = async (page, url) => {
  console.log(`🔍 Scraping category: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.grid-product'));
    return items.map(item => {
      const name = item.querySelector('.grid-product__title-inner')?.innerText?.trim();
      const price = item.querySelector('.grid-product__price-value')?.innerText?.trim();
      const productLink = item.querySelector('a.grid-product__title')?.href;
      const imgTag = item.querySelector('.grid-product__picture');
      const imageUrl = imgTag?.getAttribute('src') || null;

      const additionalDiv = item.querySelector('.grid-product__picture-additional');
      const backgroundImage = additionalDiv?.style?.backgroundImage;
      let additionalImageUrl = null;
      if (backgroundImage) {
        const match = backgroundImage.match(/url\("?([^"]+)"?\)/);
        if (match && match[1]) {
          additionalImageUrl = match[1];
        }
      }

      return {
        name,
        price,
        productLink: productLink ? `https://www.autozorg.org${new URL(productLink).pathname}` : null,
        imageUrl,
        additionalImageUrl
      };
    });
  });

  return products;
};

const scrapeAll = async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const categories = await discoverCategoryLinks(page);
  console.log(`🔗 Found ${categories.length} category links`);

  const allProducts = [];

  for (const url of categories) {
    const products = await scrapeCategory(page, url);
    if (products.length > 0) {
      allProducts.push(...products);
    } else {
      console.log(`⚠️ No products found at ${url}`);
    }
  }

  await browser.close();

  const uniqueProducts = Array.from(new Map(
    allProducts.map(p => [p.productLink, p])
  ).values());

  console.log(`✅ Done. Total unique products: ${uniqueProducts.length}`);

  fs.writeFileSync('products.json', JSON.stringify(uniqueProducts, null, 2));
};

scrapeAll();
