import puppeteer from "puppeteer";
import fs from "fs";

const BASE_URL = "https://www.gecegy.com";

async function scrapeProductListPage(page, url) {
  await page.goto(url, { waitUntil: "networkidle2" });

  // Wait for product containers to load
  await page.waitForSelector("div.oe_product", { timeout: 10000 });

  // Extract product data from the listing page
  const products = await page.evaluate((baseUrl) => {
    return Array.from(document.querySelectorAll("div.oe_product")).map(div => {
      // Title and relative URL
      const titleAnchor = div.querySelector("h6.o_wsale_products_item_title a");
      const title = titleAnchor ? titleAnchor.innerText.trim() : null;
      const relativeUrl = titleAnchor ? titleAnchor.getAttribute("href") : null;
      const url = relativeUrl ? baseUrl + relativeUrl : null;

      // Price extraction
      const priceDiv = div.querySelector("div.product_price");
      let price = null;
      if (priceDiv) {
        const visiblePriceText = priceDiv.querySelector("span.h6.mb-0")?.innerText.trim() || "";
        if (!visiblePriceText.toLowerCase().includes("not available")) {
          const hiddenPriceText = priceDiv.querySelector("span[itemprop='price']")?.innerText.trim() || "";
          price = parseFloat(hiddenPriceText.replace(/[^0-9.]/g, ""));
          if (isNaN(price) || price === 0) price = null;
        }
      }

      return { title, url, price };
    });
  }, BASE_URL);

  return products;
}

async function scrapeAllProducts(startUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let currentPage = startUrl;
  const allProducts = [];

  while (currentPage) {
    console.log(`➡️ Scraping page: ${currentPage}`);

    try {
      const products = await scrapeProductListPage(page, currentPage);
      console.log(`🔗 Found ${products.length} products on this page.`);
      allProducts.push(...products);
    } catch (err) {
      console.warn(`⚠️ Failed to scrape page ${currentPage}: ${err.message}`);
      break;
    }

    // Check if a "Next" page link exists and get its href
  const nextPage = await page.evaluate(() => {
  // Find the <a> element that contains the span with class 'fa-chevron-right'
  const nextLink = Array.from(document.querySelectorAll('a')).find(a =>
    a.querySelector('span.fa-chevron-right')
  );
  return nextLink ? nextLink.href : null;
});

    if (nextPage && nextPage !== currentPage) {
      currentPage = nextPage;
    } else {
      currentPage = null; // No more pages
    }
  }

  await browser.close();

  // Save results
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  fs.writeFileSync("./data/gec.json", JSON.stringify(allProducts, null, 2));
  console.log(`🎉 Done! Scraped a total of ${allProducts.length} products.`);
}

// Run the scraper
scrapeAllProducts(`${BASE_URL}/shop/`);
