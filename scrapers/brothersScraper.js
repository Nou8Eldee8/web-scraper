import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';


// تحديد ما إذا كان الموقع يحتاج Puppeteer (ديناميكي) أو Axios (ساكن)
const isDynamicSite = (url) => {
  return url.includes('autozorg') || url.includes('react') || url.includes('vue');
};

// ==========================
// Puppeteer-based Scraper
// ==========================
async function scrapeWithPuppeteer(baseUrl) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

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

  const uniqueLinks = Array.from(new Set(categoryLinks));
  console.log(`🔗 Found ${uniqueLinks.length} categories`);

  const allProducts = [];

  for (const url of uniqueLinks) {
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
          productLink,
          imageUrl,
          additionalImageUrl,
        };
      });
    });

    allProducts.push(...products);
  }

  await browser.close();

  const uniqueProducts = Array.from(new Map(
    allProducts.map(p => [p.productLink, p])
  ).values());

  return uniqueProducts;
}

// ==========================
// Axios + Cheerio Scraper
// ==========================
async function scrapeWithAxios(baseUrl) {
  const products = [];
  let page = 1;
  let maxPage = null;

  while (true) {
    const url = `${baseUrl}page/${page}/`;
    console.log(`🔍 Scraping: ${url}`);

    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      if (!maxPage) {
        const lastPageLink = $("ul.page-numbers li a")
          .not(".next")
          .last()
          .text()
          .trim();
        maxPage = parseInt(lastPageLink) || 1;
        console.log(`📄 Total pages: ${maxPage}`);
      }

      let productCards = $('div[class*="product"]').filter((_, el) => {
        return $(el).find("a[href]").length && $(el).find("img").length;
      });

      if (productCards.length === 0) {
        productCards = $(".product-small");
      }

      if (productCards.length === 0) break;

      productCards.each((_, el) => {
        const name = $(el).find("h3, .product-title").first().text().trim();
        const link = $(el).find("a[href]").first().attr("href");
        const img = $(el).find("img").first().attr("src");

        const priceText = $(el).find(".price ins .amount bdi, .price .amount bdi").first().text().replace(/[^0-9.]/g, "");
        const originalText = $(el).find("del .amount bdi").first().text().replace(/[^0-9.]/g, "");

        const price = parseFloat(priceText);
        const originalPrice = parseFloat(originalText) || price;

        const discountAmount = originalPrice - price;
        const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

        const finalLink = link?.startsWith("http") ? link : baseUrl + link;

        const alreadyExists = products.some(p => p.productLink === finalLink);
        if (!alreadyExists) {
          products.push({
            name,
            price,
            originalPrice,
            discountAmount,
            discountPercentage,
            productLink: finalLink,
            imageUrl: img?.startsWith("http") ? img : `https:${img}`,
          });
        }
      });

      if (page >= maxPage) break;
      page++;
    } catch (err) {
      console.error(`❌ Failed to scrape ${url}:`, err.message);
      break;
    }
  }

  return products;
}

// ==========================
// Unified Entry Point
// ==========================
async function universalScrape(url) {
  const usePuppeteer = isDynamicSite(url);
  let products = [];

  try {
    products = usePuppeteer
      ? await scrapeWithPuppeteer(url)
      : await scrapeWithAxios(url);
  } catch (err) {
    console.error("❌ Scraping failed:", err.message);
    return;
  }

  fs.writeFileSync("brothers.json", JSON.stringify(products, null, 2));
  console.log(`✅ Scraped ${products.length} products`);
}

// CLI Run
const targetUrl = process.argv[2] || "https://brothers.care/shop/";
universalScrape(targetUrl);