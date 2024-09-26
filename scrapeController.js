const scrapers = require("./scraper");
const dbConnection = require("./connect-db");

const menuItems = [
  "https://phongtro123.com/cho-thue-phong-tro",
  "https://phongtro123.com/nha-cho-thue",
  "https://phongtro123.com/cho-thue-can-ho",
  "https://phongtro123.com/cho-thue-mat-bang",
  "https://phongtro123.com/tim-nguoi-o-ghep",
];

const scrapeController = async (browserInstance) => {
  try {
    for (let i = 0; i < menuItems.length; i++) {
      const url = menuItems[i];
      await scrapers.scraper(browserInstance, url, dbConnection);
    }
    console.log("Done scraping");
    await browserInstance.close();
    process.exit(0);
  } catch (error) {
    console.log("Error appeared at scrapeController: ", error);
  }
};

module.exports = scrapeController;
