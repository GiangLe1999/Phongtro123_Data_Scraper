// Create browser instance
const puppeteer = require("puppeteer");

const startBrowser = async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      // No interface
      headless: true,
      // Chrome uses multiple layers of sandbox to avoid untrusted content
      args: ["--disable-setuid-sandbox"],
      // Ignore https error
      ignoreHTTPSErrors: true,
    });
  } catch (error) {
    console.log("Can't start browser");
  }

  return browser;
};

module.exports = startBrowser;
