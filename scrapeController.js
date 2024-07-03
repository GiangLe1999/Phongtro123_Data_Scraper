const scrapers = require("./scraper");
const fs = require("fs");

const menuItems = [
  "https://phongtro123.com/cho-thue-phong-tro",
  "https://phongtro123.com/nha-cho-thue",
  "https://phongtro123.com/cho-thue-can-ho",
  "https://phongtro123.com/cho-thue-mat-bang",
  "https://phongtro123.com/tim-nguoi-o-ghep",
];

const scrapeController = async (browserInstance) => {
  try {
    // Run to get data from 5 pages
    // for (let i = 0; i < menuItems.length; i++) {
    //   const url = menuItems[i];
    //   const results = await scrapers.scraper(browserInstance, url);
    //   const filename = `${url.split("/").pop()}.json`;
    //   fs.writeFile(filename, JSON.stringify(results, null, 2), (error) => {
    //     if (error) {
    //       console.log(`Failed to write data to ${filename}: ${error}`);
    //     } else {
    //       console.log(`Successfully wrote data to ${filename}`);
    //     }
    //   });
    // }
    // console.log("Done scraping from 5 pages");
    // await browserInstance.close();
    // process.exit(0);

    // Run to get categories data
    const results = await scrapers.scrapeCategoriesData(browserInstance);
    fs.writeFile(
      "categories-data.json",
      JSON.stringify(results, null, 2),
      (error) => {
        if (error) {
          console.log(`Failed to write data to categories-data.json: ${error}`);
        } else {
          console.log(`Successfully wrote data to categories-data.json`);
        }
      }
    );
  } catch (error) {
    console.log("Error appeared at scrapeController: ", error);
  }
};

module.exports = scrapeController;
