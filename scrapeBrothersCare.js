const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeAllProductsFromShop(baseUrl = "https://nanostores-eg.com/shop/") {
  const products = [];
  let page = 1;
  let maxPage = null;

  while (true) {
    const url = `${baseUrl}page/${page}/`;
    console.log(`🔍 Scraping: ${url}`);

    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      // 📄 اكتشاف عدد الصفحات
      if (!maxPage) {
        const lastPageLink = $("ul.page-numbers li a")
          .not(".next")
          .last()
          .text()
          .trim();
        maxPage = parseInt(lastPageLink) || 1;
        console.log(`📄 Detected total pages: ${maxPage}`);
      }

      // 1️⃣ المحاولة الذكية
      let productCards = $('div[class*="product"]').filter((_, el) => {
        const hasLink = $(el).find("a[href]").length > 0;
        const hasImage = $(el).find("img").length > 0;
        const hasName = $(el).find("h3, .product-title").length > 0;
        return hasLink && hasImage && hasName;
      });

      // 2️⃣ fallback لو مفيش نتائج
      if (productCards.length === 0) {
        productCards = $(".product-small");
      }

      if (productCards.length === 0) {
        console.log("❌ No products found on this page. Stopping.");
        break;
      }

      productCards.each((_, el) => {
        const name = $(el).find("h3, .product-title, .wd-entities-title").first().text().trim();
        const link = $(el).find("a[href]").first().attr("href");
        const img = $(el).find("img").first().attr("src");

        const priceText = $(el).find(".price ins .amount bdi, .price .amount bdi").first().text().replace(/[^0-9.]/g, "");
        const originalText = $(el).find("del .amount bdi").first().text().replace(/[^0-9.]/g, "");

        const price = parseFloat(priceText);
        const originalPrice = parseFloat(originalText) || price;

        const discountAmount = originalPrice - price;
        const discountPercentage =
          originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

        const finalLink = link?.startsWith("http") ? link : baseUrl + link;

// prevent duplicates by checking if productLink already exists
const alreadyExists = products.some((p) => p.productLink === finalLink);

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

      if (page >= maxPage) {
        console.log("✅ Reached last page.");
        break;
      }

      page++;
    } catch (err) {
      console.error(`❌ Failed to scrape ${url}:`, err.message);
      break;
    }
  }

  return products;
}

if (require.main === module) {
  scrapeAllProductsFromShop().then((products) => {
    console.log(`✅ Found ${products.length} products in total.`);
    console.log(products);
  });
}

module.exports = { scrapeAllProductsFromShop };
