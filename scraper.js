// Scrape urls of all postings on 1 listing page
const scrapeDetailPagesUrlsOn1Page = async (url, browser) => {
  try {
    const newPage = await browser.newPage();
    await newPage.goto(url);
    await newPage.waitForSelector("#main");
    const urls = await newPage.$$eval(
      "#left-col > section.section-post-listing > ul > li",
      (elements) => {
        return elements.map((element) => {
          return element.querySelector(".post-meta > h3 > a").href;
        });
      }
    );

    const paginationSelector =
      "#left-col > ul.pagination > li.page-item:last-child > a";
    const nextPageUrl = await newPage.$eval(paginationSelector, (element) => {
      return element?.href;
    });
    await newPage.close();
    return { urls, nextPageUrl };
  } catch (error) {
    console.error("Error appeared at scrapeDetailPagesUrlsOn1Page:", error);
  }
};

// Scrape urls of all postings on 5 listing pages same category
const scrapeDetailPagesUrlsOn5Page = async (browser, url) => {
  try {
    let pageUrl = url;
    const detailPageUrls = [];

    for (let i = 0; i < 5; i++) {
      const { urls, nextPageUrl } = await scrapeDetailPagesUrlsOn1Page(
        pageUrl,
        browser
      );
      detailPageUrls.push(...urls);
      pageUrl = nextPageUrl;
    }

    return detailPageUrls;
  } catch (error) {
    console.error("Error appeared at scrapeDetailPagesUrlsOn5Page:", error);
  }
};

// Scrape data from each detail page
const scrapeDetailPage = async (browser, url) => {
  try {
    const detailPage = await browser.newPage();
    await detailPage.goto(url, { waitUntil: "networkidle2", timeout: 300000 });
    console.log(`Get access to ${url}`);

    let detailPageData = {};

    await detailPage.waitForSelector("#main");

    // Get images and videos from Swiper
    const swiperSlideSelector =
      "#left-col > article > div.post-images > div > div.swiper-wrapper > div.swiper-slide";

    const detailPageImages = await detailPage.$$eval(
      swiperSlideSelector,
      (elements) => {
        const imageSrcs = elements.map(
          (element) => element.querySelector("img")?.src || ""
        );
        return [...new Set(imageSrcs.filter((src) => src !== ""))];
      }
    );
    detailPageData.images = detailPageImages;

    const detailPageVideos = await detailPage.$$eval(
      swiperSlideSelector,
      (elements) => {
        const videoSrcs = elements.map(
          (element) => element.querySelector("video > source")?.src || ""
        );
        return [...new Set(videoSrcs.filter((src) => src !== ""))];
      }
    );
    detailPageData.videos = detailPageVideos;

    // Get header of detail page
    const detailPageHeader = await detailPage.$eval(
      "header.page-header",
      (element) => {
        function convertPriceToNumber(priceText) {
          let cleanedPrice, priceNumber;

          if (priceText.includes("triệu/tháng")) {
            cleanedPrice = priceText.replace("triệu/tháng", "").trim();
            priceNumber = parseFloat(cleanedPrice);
            return Math.round(priceNumber * 1000000);
          } else if (priceText.includes("đồng/tháng")) {
            cleanedPrice = priceText.replace("đồng/tháng", "").trim();
            priceNumber = parseFloat(cleanedPrice.replace(/,/g, ""));
            return Math.round(priceNumber);
          } else {
            throw new Error("Unexpected price format");
          }
        }

        return {
          title: element.querySelector("h1 > a").innerText,
          stars: element.querySelector("h1 > span")?.className.slice(-1) || 0,
          address: element.querySelector("address").innerText,
          price: convertPriceToNumber(
            element.querySelector("div.post-attributes > .price > span")
              ?.innerText
          ),
          area: element
            .querySelector("div.post-attributes > .acreage > span")
            ?.innerText.replace("m2", "")
            .trim(),
        };
      }
    );
    Object.assign(detailPageData, detailPageHeader);

    // Get detail data of detail page
    const detailPageMainContent = await detailPage.$$eval(
      "#left-col > article.the-post > section.post-main-content > div.section-content p",
      (elements) => elements.map((p) => p.innerText).join(" ")
    );
    detailPageData.main_content = detailPageMainContent;

    // Get posting overview
    const detailPageOverview = await detailPage.$$eval(
      "#left-col > article.the-post > section.post-overview > div.section-content > table.table > tbody > tr",
      (elements) => ({
        sub_category: elements[1].querySelector("td:last-child").innerText,
        category: elements[2].querySelector("td:last-child").innerText,
        post_type: elements[3].querySelector("td:last-child").innerText,
        tenant_type: elements[4].querySelector("td:last-child").innerText,
        package_type: elements[5].querySelector("td:last-child").innerText,
        created_at: elements[6].querySelector("td:last-child").innerText,
        expired_at: elements[7].querySelector("td:last-child").innerText,
      })
    );
    Object.assign(detailPageData, detailPageOverview);

    // Get posting contacts
    const detailPageContacts = await detailPage.$$eval(
      "#left-col > article.the-post > section.post-contact > div.section-content > table.table > tbody > tr",
      (elements) => ({
        contact_name: elements[0].querySelector("td:last-child").innerText,
        tel: elements[1].querySelector("td:last-child").innerText,
        zalo: elements[2].querySelector("td:last-child").innerText,
      })
    );
    detailPageData.contacts = detailPageContacts;

    // Get GG maps embed link
    const detailPageMapsEmbedLink = await detailPage.$eval(
      "#left-col > article.the-post > section.post-map > div.section-content > #__maps_content > iframe",
      (element) => element?.src
    );
    detailPageData.maps_embed_link = detailPageMapsEmbedLink;

    await detailPage.close();
    return detailPageData;
  } catch (error) {
    console.log("Error appeared at scrapeDetailPage: ", error);
  }
};

// Scrape all detail pages
const scrapeAllDetailPages = async (browser, detailPageUrls) => {
  try {
    const allPagesDetails = await Promise.all(
      detailPageUrls.map((url) => scrapeDetailPage(browser, url))
    );
    return allPagesDetails;
  } catch (error) {
    console.log("Error appeared at scrapeAllDetailPages: ", error);
  }
};

const scraper = async (browser, url) => {
  try {
    const scrapeData = {};
    scrapeData.urls = await scrapeDetailPagesUrlsOn5Page(browser, url);
    scrapeData.body = await scrapeAllDetailPages(browser, scrapeData.urls);
    return scrapeData;
  } catch (error) {
    console.log("Error appeared at scraper: ", error);
  }
};

module.exports = { scraper };
