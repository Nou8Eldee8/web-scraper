const fs = require("fs");
const path = require("path");
const { scrapeAllProductsFromShop } = require("./scrapeBrothersCare");

async function runFullScrape() {
  console.log("🚀 Starting full scrape from brothers.care/shop");

  const products = await scrapeAllProductsFromShop();

  // ✅ نمنع التكرار
  const uniqueMap = new Map();
  for (const p of products) {
    if (!uniqueMap.has(p.productLink)) {
      uniqueMap.set(p.productLink, p);
    }
  }
  const uniqueProducts = Array.from(uniqueMap.values());

  console.log(`✅ Scraped total: ${products.length}`);
  console.log(`🔍 Unique products: ${uniqueProducts.length}`);
  console.log(`🧯 Duplicates removed: ${products.length - uniqueProducts.length}`);

  // Save to products.json
  const outputPath = path.join(__dirname, "products.json");
  fs.writeFileSync(outputPath, JSON.stringify(uniqueProducts, null, 2), "utf-8");

  console.log(`📦 Data saved to: ${outputPath}`);
}

runFullScrape();
