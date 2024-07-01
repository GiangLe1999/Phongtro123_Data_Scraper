const scrapers = require("./scraper");
const fs = require("fs");

const scrapeController = async (browserInstance) => {
  try {
    const categories = await scrapers.scrapeCategory(
      browserInstance,
      "https://phongtro123.com/"
    );

    const results = await scrapers.scraper(browserInstance, categories[5].url);
    fs.writeFile("tim-nguoi-o-ghep.json", JSON.stringify(results), (error) => {
      if (error) console.log(`Failed to write data to json file: ${error}`);
    });
  } catch (error) {
    console.log("Error appeared at scrapeController: ", error);
  }
};

module.exports = scrapeController;
