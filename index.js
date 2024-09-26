require("dotenv").config()(
  // Invoked Function Expression to call the asynchronous function immediately
  async () => {
    const startBrowser = require("./browser");
    const scrapeController = require("./scrapeController");

    let browser = await startBrowser();
    await scrapeController(browser);
  }
)();
