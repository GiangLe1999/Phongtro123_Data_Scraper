const scrapeCategory = async (browser, url) => {
  try {
    let page = await browser.newPage();
    console.log("Open new tab ...");

    await page.goto(url);
    console.log(`Get access to ${url} to get categories`);

    // Wait for the required DOM Selector webpage to be rendered
    await page.waitForSelector("#webpage");
    console.log(`Completed loading #webpage element ${url}`);

    // $$eval will run a function on an array of elements selected by a CSS selector
    const categoriesData = await page.$$eval(
      "#navbar-menu > ul > li",
      (elements) => {
        categoriesData = elements.map((element) => {
          return {
            name: element.querySelector("a").innerText,
            url: element.querySelector("a").href,
          };
        });
        return categoriesData;
      }
    );
    await page.close();
    console.log(`Close tab ${url} after getting all categories`);

    return categoriesData;
  } catch (error) {
    console.log("Error appeard at scrapeCategory: ", error);
  }
};

// Scrape data from multiple pages using URLs obtained from the scrapeCategory function
const scraper = async (browser, url) => {
  try {
    let newPage = await browser.newPage();
    console.log("Open new tab ...");

    await newPage.goto(url);
    console.log(`Get access to ${url}`);

    await newPage.waitForSelector("#main");
    console.log(`Completed loading #main element of ${url}`);

    const scrapeData = {};

    // Get Title vs Description
    const pageHeaderData = await newPage.$eval("header", (element) => ({
      title: element.querySelector("h1").innerText,
      description: element.querySelector("p").innerText,
    }));
    scrapeData.header = pageHeaderData;
    console.log(`Get header data of ${url} successfully`);

    // Get url of detail page
    // In this case, ul is descendant element of #left-col (Only use > when ul is direct child element of #left-col)
    const detailPageUrls = await newPage.$$eval(
      "#left-col > section.section-post-listing > ul > li",
      (elements) => {
        detailPageUrls = elements.map((element) => {
          return element.querySelector(".post-meta > h3 > a").href;
        });
        return detailPageUrls;
      }
    );
    scrapeData.urls = detailPageUrls;
    console.log(`Get urls of detailed postings on ${url} successfully`);

    // Scrape data from each detail page
    const scrapeDetailPageData = async (url) => {
      try {
        const detailPage = await browser.newPage();
        console.log("Open new tab ...");

        await detailPage.goto(url);
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
            const cleanImageSrcs = imageSrcs?.filter((src) => src !== "");
            return [...new Set(cleanImageSrcs)];
          }
        );
        detailPageData.images = detailPageImages;
        console.log(`Get images of ${url} successfully`);

        const detailPageVideos = await detailPage.$$eval(
          swiperSlideSelector,
          (elements) => {
            const videoSrcs = elements.map(
              (element) => element.querySelector("video > source")?.src || ""
            );

            const cleanVideoSrcs = videoSrcs?.filter((src) => src !== "");
            return [...new Set(cleanVideoSrcs)];
          }
        );
        detailPageData.videos = detailPageVideos;
        console.log(`Get videos of ${url} successfully`);

        // Get header of detail page
        const detailPageHeader = await detailPage.$eval(
          "header.page-header",
          (element) => ({
            title: element.querySelector("h1 > a").innerText,
            stars: element.querySelector("h1 > span")?.className.slice(-1) || 0,
            address: element.querySelector("address").innerText,
            price: element.querySelector("div.post-attributes > .price > span")
              .innerText,
            area: element.querySelector("div.post-attributes > .acreage > span")
              .innerText,
          })
        );
        detailPageData.header = detailPageHeader;
        console.log(`Get header of ${url} successfully`);

        // Get detail data of detail page
        const detailPageMainContent = await detailPage.$$eval(
          "#left-col > article.the-post > section.post-main-content > div.section-content p",
          (elements) => {
            return elements
              ?.map((p) => `<p>${p.innerText}</p>`)
              .join(",")
              .replace(/,/g, "");
          }
        );
        detailPageData.main_content = detailPageMainContent;
        console.log(`Get main content of ${url} successfully`);

        // Get posting overview
        detailPageData.overview = {
          category: "",
          region: "",
          post_type: "",
          tenant_type: "",
          package_type: "",
          created_at: "",
          expired_at: "",
        };
        const detailPageOverview = await detailPage.$$eval(
          "#left-col > article.the-post > section.post-overview > div.section-content > table.table > tbody > tr",
          (elements) => {
            const details = {
              category: elements[1].querySelector("td:last-child").innerText,
              region: elements[2].querySelector("td:last-child").innerText,
              post_type: elements[3].querySelector("td:last-child").innerText,
              tenant_type: elements[4].querySelector("td:last-child").innerText,
              package_type:
                elements[5].querySelector("td:last-child").innerText,
              created_at: elements[6].querySelector("td:last-child").innerText,
              expired_at: elements[7].querySelector("td:last-child").innerText,
            };

            return details;
          }
        );
        detailPageData.overview = detailPageOverview;
        console.log(`Get overview of ${url} successfully`);

        // Get posting contacts
        const detailPageContacts = await detailPage.$$eval(
          "#left-col > article.the-post > section.post-contact > div.section-content > table.table > tbody > tr",
          (elements) => {
            const contacts = {
              contact_name:
                elements[0].querySelector("td:last-child").innerText,
              tel: elements[1].querySelector("td:last-child").innerText,
              zalo: elements[2].querySelector("td:last-child").innerText,
            };

            return contacts;
          }
        );
        detailPageData.contacts = detailPageContacts;
        console.log(`Get contacts of ${url} successfully`);

        // Get GG maps embed link
        const detailPageMapsEmbedLink = await detailPage.$eval(
          "#left-col > article.the-post > section.post-map > div.section-content > #__maps_content > iframe",
          (element) => element?.src
        );
        detailPageData.maps_embed_link = detailPageMapsEmbedLink;
        console.log(`Get GG maps embed link of ${url} successfully`);

        await detailPage.close();
        console.log(`Closed tab ${url}`);

        return detailPageData;
      } catch (error) {
        console.log("Error appeared at scrapeDetailPageData: ", error);
      }
    };

    const scrapeAllDetailPages = async (detailPageUrls) => {
      try {
        const allPagesDetails = await Promise.all(
          detailPageUrls.map((url) => scrapeDetailPageData(url))
        );

        return allPagesDetails;
      } catch (error) {
        console.error("Error fetching all detail page data:", error);
      }
    };

    scrapeData.body = await scrapeAllDetailPages(detailPageUrls);

    await browser.close();
    console.log("Closed browser ...");

    return scrapeData;
  } catch (error) {
    console.log("Error appeard at scraper: ", error);
  }
};

module.exports = { scrapeCategory, scraper };
