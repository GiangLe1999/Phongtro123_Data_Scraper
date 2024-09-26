const { formatStringToDate } = require("./utils/format");

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
const scrapeDetailPage = async (
  browser,
  url,
  dbConnection,
  categories,
  districts,
  provinces
) => {
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

    const detailPageLocation = await detailPage.$eval(
      "#breadcrumb",
      (element) => {
        const breadcrumbItems = element.querySelectorAll("li");

        const province = breadcrumbItems[1]?.innerText.trim().normalize("NFC");
        const district = breadcrumbItems[2]?.innerText.trim().normalize("NFC");

        return { province, district };
      }
    );

    const detailPageCategory = await detailPage.$eval(
      ".current-menu-item",
      (element) => {
        return element.innerText.normalize("NFC");
      }
    );

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
    const detailPageMainContent = await detailPage.$eval(
      "#left-col > article.the-post > section.post-main-content > div.section-content",
      (element) => element.outerHTML.replace(/'/g, "")
    );
    detailPageData.main_content = detailPageMainContent;

    // Get posting overview
    const detailPageOverview = await detailPage.$$eval(
      "#left-col > article.the-post > section.post-overview > div.section-content > table.table > tbody > tr",
      (elements) => ({
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

    const category = categories?.find(
      (cate) => cate.name.normalize("NFC") === detailPageCategory
    );

    const province = provinces?.find(
      (prov) => prov.name.normalize("NFC") === detailPageLocation.province
    );

    const district = districts?.find(
      (dist) =>
        dist.name.normalize("NFC") === detailPageLocation.district &&
        province?.id == dist.provinceId
    );

    // Find user by telephone number
    const findQuery = "SELECT * FROM user WHERE tel = ?";
    dbConnection.query(
      findQuery,
      [detailPageData.contacts.tel],
      (err, results) => {
        if (err) {
          console.error("Error executing query: ", err);
        }

        if (results.length > 0) {
          // User exists, create a new posting
          const insertPostingQuery = `
          INSERT INTO posting (
            images, videos, title, address, price, area, main_content, categoryId, districtId, provinceId, tenant_type, package_type, expired_at, is_crawled, userId, maps_embed_link
          ) VALUES (
            '${JSON.stringify(detailPageData.images)}',
            '${JSON.stringify(detailPageData.videos)}',
            '${detailPageData.title}',
            '${detailPageData.address}',
            ${detailPageData.price},
            ${parseFloat(detailPageData.area)},
            '${detailPageData.main_content}',
            ${parseInt(category?.id) || 0},
            ${parseInt(district?.id) || 0},
            ${parseInt(province?.id) || 0},
            '${detailPageData.tenant_type}',
            '${detailPageData.package_type}',
            '${formatStringToDate(detailPageData.expired_at) || null}',
            ${true},
            ${results[0].id},
            '${detailPageData.maps_embed_link}'
          )`;

          dbConnection.query(insertPostingQuery, (insertErr, insertResults) => {
            if (insertErr) {
              console.error("Error inserting new posting: ", insertErr);
            }
            console.log("New posting created with ID:", insertResults.insertId);
          });
        } else {
          // No user found, create a new user
          console.log(
            "No user found with this telephone number. Creating new user..."
          );

          const insertUserQuery = `
          INSERT INTO user (tel, name, zalo, role, is_crawled)
          VALUES ('${detailPageData.contacts.tel}', 
          '${detailPageData.contacts.contact_name}', 
          '${detailPageData.contacts.zalo || ""}', 'Chính chủ', ${true})`;

          dbConnection.query(insertUserQuery, (insertErr, insertResults) => {
            if (insertErr) {
              console.error("Error inserting new user: ", insertErr);
            }

            const newUserId = insertResults.insertId;
            console.log("New user created with ID:", newUserId);

            const insertPostingQuery = `
            INSERT INTO posting (
              images, videos, title, address, price, area, main_content, categoryId, districtId, provinceId, tenant_type, package_type, expired_at, is_crawled, userId, maps_embed_link
            ) VALUES (
              '${JSON.stringify(detailPageData.images)}',
              '${JSON.stringify(detailPageData.videos)}',
              '${detailPageData.title}',
              '${detailPageData.address}',
              ${detailPageData.price},
              ${parseFloat(detailPageData.area)},
              '${detailPageData.main_content}',
              ${parseInt(category?.id) || 0},
              ${parseInt(district?.id) || 0},
              ${parseInt(province?.id) || 0},
              '${detailPageData.tenant_type}',
              '${detailPageData.package_type}',
              '${formatStringToDate(detailPageData.expired_at) || null}',
              ${true},
              ${parseInt(newUserId)},
              '${detailPageData.maps_embed_link}'
            )`;

            dbConnection.query(
              insertPostingQuery,
              (insertErr, insertResults) => {
                if (insertErr) {
                  console.error("Error inserting new posting: ", insertErr);
                }
                console.log(
                  "New posting created with ID:",
                  insertResults.insertId
                );
              }
            );
          });
        }
      }
    );

    await detailPage.close();
  } catch (error) {
    console.log("Error appeared at scrapeDetailPage: ", error);
  }
};

// Query to fetch all categories
const getAllCategories = async (dbConnection) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM category";
    dbConnection.query(query, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

// Query to fetch all districts
const getAllDistricts = async (dbConnection) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM district";
    dbConnection.query(query, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

// Query to fetch all provinces
const getAllProvinces = async (dbConnection) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM province";
    dbConnection.query(query, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

// Usage example
const fetchAllInitialData = async (dbConnection) => {
  try {
    const [categories, districts, provinces] = await Promise.all([
      getAllCategories(dbConnection),
      getAllDistricts(dbConnection),
      getAllProvinces(dbConnection),
    ]);

    // You can return the data or continue processing it
    return { categories, districts, provinces };
  } catch (err) {
    console.error("Error fetching data:", err);
  }
};

// Scrape all detail pages
const scrapeAllDetailPages = async (browser, detailPageUrls, dbConnection) => {
  try {
    const { categories, districts, provinces } = await fetchAllInitialData(
      dbConnection
    );

    const allPagesDetails = [];

    for (const url of detailPageUrls) {
      const pageDetails = await scrapeDetailPage(
        browser,
        url,
        dbConnection,
        categories,
        districts,
        provinces
      );
      allPagesDetails.push(pageDetails);
    }

    return allPagesDetails;
  } catch (error) {
    console.log("Error appeared at scrapeAllDetailPages: ", error);
  }
};

const scraper = async (browser, url, dbConnection) => {
  try {
    const scrapeData = {};
    scrapeData.urls = await scrapeDetailPagesUrlsOn5Page(browser, url);
    scrapeData.body = await scrapeAllDetailPages(
      browser,
      scrapeData.urls,
      dbConnection
    );
    return scrapeData;
  } catch (error) {
    console.log("Error appeared at scraper: ", error);
  }
};

const scrapeBigCategoriesUrls = async (browser) => {
  try {
    const newPage = await browser.newPage();
    await newPage.goto("https://phongtro123.com/");
    await newPage.waitForSelector("#webpage");

    const results = await newPage.$$eval(
      "#page-footer ul.show-sublink li a",
      (elements) => {
        return elements.map((element) => ({
          name: element?.innerText,
          url: element?.href,
        }));
      }
    );

    await newPage.close();
    return results;
  } catch (error) {
    console.log("Error appeared at scrapeBigCategoriesUrls: ", error);
    return [];
  }
};

const scrapeSmallCategoriesData = async (browser, url) => {
  try {
    const newPage = await browser.newPage();
    await newPage.goto(url);
    console.log(`Accessed ${url}`);
    await newPage.waitForSelector("#webpage");

    const results = await newPage.$$eval(
      "#main ul.location-district > li > a",
      (elements) => {
        return elements.map((element) => ({
          name: element?.innerText.replace(/\s*\(.*?\)/, ""),
          url: element?.href.replace("https://phongtro123.com/", ""),
        }));
      }
    );

    await newPage.close();
    return results;
  } catch (error) {
    console.log("Error appeared at scrapeSmallCategoryData: ", error);
    return [];
  }
};

const scrapeCategoriesData = async (browser) => {
  try {
    const bigCategoriesData = await scrapeBigCategoriesUrls(browser);

    const smallCategoriesPromises = bigCategoriesData.map((category) =>
      scrapeSmallCategoriesData(browser, category.url)
    );

    const data = await Promise.all(smallCategoriesPromises);
    return data;
  } catch (error) {
    console.log("Error appeared at scrapeCategoriesData: ", error);
    return [];
  }
};

module.exports = {
  scraper,
  scrapeCategoriesData,
};
