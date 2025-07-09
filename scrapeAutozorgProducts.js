const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeProductsFromSubCategory(subCategoryUrl) {
  const products = [];
  const { data: html } = await axios.get(subCategoryUrl);
  const $ = cheerio.load(html);

  $(".ec-product-block").each((_, el) => {
    const name = $(el).find(".ec-product-title").text().trim();
    const link = $(el).find(".ec-product-title a").attr("href");
    const img = $(el).find(".ec-product-image img").attr("src");
    const priceText = $(el).find(".ec-price span[itemprop='price']").text().replace(/[^0-9.]/g, "");
    const price = parseFloat(priceText);

    products.push({
      name,
      price,
      productLink: link?.startsWith("http") ? link : `https://www.autozorg.org${link}`,
      imageUrl: img?.startsWith("http") ? img : `https://www.autozorg.org${img}`,
    });
  });

  return products;
}

module.exports = { scrapeProductsFromSubCategory };
