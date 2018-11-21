const config = require("./data/config/scrapingConfig.json")
let ScraperPuppeteerFotocasa;

if (config.method == "boundingBox") {
    ScraperPuppeteerFotocasa = require("./ScraperPuppeteerFotocasaBoudingBox");
} else {
    ScraperPuppeteerFotocasa = require("./ScraperPuppeteerFotocasaCusec");
}


const app = new ScraperPuppeteerFotocasa();
app.main();