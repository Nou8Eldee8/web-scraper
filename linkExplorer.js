const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://brothers.care";

async function discoverCategoryLinks() {
  try {
    const { data: html } = await axios.get(BASE_URL);
    const $ = cheerio.load(html);

    const links = new Set();

    // اسحب كل الروابط من الهيدر أو المينيو
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      // تجاهل روابط المنتجات الفردية أو الخارجية أو الـ anchors
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // حول الرابط المطلق إلى رابط كامل
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

      // تجاهل روابط المنتجات (غالبًا تحتوي على "product" أو ends with .html)
      if (fullUrl.includes("/product/")) return;

      // تأكد إن الرابط ينتمي للدومين نفسه
      if (!fullUrl.startsWith(BASE_URL)) return;

      // فلترة مبدئية لرابط تصنيف أو صفحة عامة
      const path = new URL(fullUrl).pathname;
      if (
        path.split("/").filter(Boolean).length <= 2 && // ما يكونش link عميق جدًا
        !path.includes(".") // ما يكونش ملف
      ) {
        links.add(fullUrl.split("?")[0]); // تجاهل query params
      }
    });

    console.log("✅ Found category/sub-category links:");
    for (const link of links) {
      console.log(link);
    }

    return Array.from(links);
  } catch (err) {
    console.error("Failed to load base page:", err.message);
    return [];
  }
}

discoverCategoryLinks();

module.exports = { discoverCategoryLinks };
