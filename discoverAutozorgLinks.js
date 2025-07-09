const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.autozorg.org";

async function discoverMainCategoryLinks() {
  const { data: html } = await axios.get(`${BASE_URL}/store`);
  const $ = cheerio.load(html);

  const links = new Set();

  $("a[href^='/store/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href.includes("-c")) {
      links.add(BASE_URL + href);
    }
  });

  return Array.from(links);
}

async function discoverSubCategoryLinks(categoryUrl) {
  const { data: html } = await axios.get(categoryUrl);
  const $ = cheerio.load(html);

  const subLinks = new Set();

  $("a[href^='/store/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href.includes("-c")) {
      subLinks.add(BASE_URL + href);
    }
  });

  return Array.from(subLinks);
}

module.exports = { discoverMainCategoryLinks, discoverSubCategoryLinks };
