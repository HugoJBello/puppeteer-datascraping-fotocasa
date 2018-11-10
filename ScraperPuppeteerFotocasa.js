const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const fs = require('fs');
const FeatureProcessor = require('./FeatureProcessor');

const MongoSaver = require('./MongoDAO');

module.exports = class ScraperPuppeteerFotocasa {
    constructor() {
        require('dotenv').load();
        this.browser = null;
        this.page = null;
        this.timeWaitStart = 1 * 1000;
        this.timeWaitClick = 500;
        this.mongoUrl = process.env['MONGO_URL'];
        this.retries = 3;
        this.separatedFeatures = require("./data/separatedFeatures/separatedFeatures.json");
        this.config = require("./data/config/scrapingConfig.json");
        this.featureProcessor = new FeatureProcessor();
        this.featureProcessor.sessionId = this.config.sessionId;

        this.appId = "fotocasa";
        this.mongoSaver = new MongoSaver(this.mongoUrl, this.appId, this.config);
        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndex.json";
        this.scrapingIndex = require(this.scrapingIndexPath);
        this.tmpDir = "data/tmp/"
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync("./" + this.tmpDir);
        }
    }

    async main() {
        console.log("starting app");
        //this.resetIndex();
        await this.initializeConfigAndIndex();
        for (let nmun in this.separatedFeatures) {
            console.log("-----------------------\n Scraping data from " + nmun + "\n-----------------------");
            if (!this.scrapingIndex.municipios[nmun].scraped) {
                let municipioResults = await this.initializeMunicipio(nmun);
                for (let cusecName in this.separatedFeatures[nmun]) {
                    console.log("\n------->" + cusecName)
                    if (!this.scrapingIndex.municipios[nmun].cusecs[cusecName]) {
                        try {
                            let cusecFeature = this.separatedFeatures[nmun][cusecName];
                            const cusecData = await this.extractFromCusec(cusecFeature);
                            municipioResults.cusecs[cusecName] = cusecData;

                            this.updateIndex(cusecName, nmun);
                            await this.saveData(municipioResults, nmun);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                }
                this.scrapingIndex.municipios[nmun].scraped = true;
            }
        }

        this.resetIndexAndFinalize();
    }

    async initializeMunicipio(nmun) {
        if (!fs.existsSync(this.tmpDirSession)) {
            fs.mkdirSync("./" + this.tmpDirSession);
        }
        if (this.config.useMongoDb) {
            let municipio = await this.mongoSaver.getMunicipioFromMongo(nmun);
            if (!municipio) {
                municipio = this.getNewMunicipio(nmun);
            }
            return municipio;
        } else {
            let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
            if (fs.existsSync(nmunPath)) {
                return require("./" + nmunPath);
            } else {
                return this.getNewMunicipio(nmun);
            }
        }
    }

    getNewMunicipio(nmun) {
        return { _id: nmun + "---" + this.config.sessionId, nmun: nmun, scrapingId: this.config.sessionId, date: new Date(), cusecs: {} }
    }


    async initializeConfigAndIndex() {
        this.config = require("./data/config/scrapingConfig.json");
        if (this.config.useMongoDb) {
            this.scrapingIndex = await this.mongoSaver.getIndexFromMongo();
            if (!this.scrapingIndex) {
                console.log("------\n initializing index");
                this.featureProcessor.processAllFeaturesAndCreateIndex();
                this.scrapingIndex = this.featureProcessor.scrapingIndex;
            }
        } else {
            this.scrapingIndex = require("./data/separatedFeatures/scrapingIndex.json");
        }
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
    }


    async extractFromCusec(cusecFeature) {
        try {

            let index = require("./data/separatedFeatures/scrapingIndex.json");
            const nmun = cusecFeature.nmun;
            const cusec = cusecFeature.cusec;
            const boundingBox = cusecFeature.boundingBox;
            const centerPoint = cusecFeature.centerPoint;

            //https://www.fotocasa.es/es/comprar/casas/espana/tu-zona-de-busqueda/l?latitude=40&longitude=-4&combinedLocationIds=724,0,0,0,0,0,0,0,0&gridType=list&mapBoundingBox=-3.8271903991699223,40.48299278830796;-3.8271903991699223,40.36760453588204;-3.538284301757813,40.36760453588204;-3.538284301757813,40.48299278830796;-3.8271903991699223,40.48299278830796&latitudeCenter=40.42532340569747&longitudeCenter=-3.6827373504638676&zoom=13
            const url = `https://www.fotocasa.es/es/comprar/casas/espana/tu-zona-de-busqueda/l?latitude=40&longitude=-4&combinedLocationIds=724,0,0,0,0,0,0,0,0&gridType=list&mapBoundingBox=${boundingBox[0][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[1][1]};&latitudeCenter=${centerPoint[1]}&longitudeCenter=${centerPoint[0]}&zoom=16`

            console.log("\n---");
            console.log(url);
            console.log("---");

            await this.initializePuppeteer();
            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);

            if (await this.anyResultsFound()) {
                let numberOfEntries;
                //numberOfEntries = await this.extractNumberOfEntries();

                let adData = [];
                let isNextPage = true;
                let pageNum = 1;
                let pageLimit = this.config.pageLimit;
                while (isNextPage) {
                    console.log("-->scraping page " + pageNum);
                    try {
                        const pageData = await this.extractPageData();
                        adData.push(...pageData);
                    } catch (err) {
                        console.log("error obtaining data for page");
                        console.log(err);
                    }

                    //console.log("found " + numberOfEntries + " entries in this page");
                    isNextPage = (await this.goToNextPage() && (pageNum < pageLimit));
                    pageNum = pageNum + 1;
                }

                let averagePrize = this.calculateAverage(adData);
                let numberOfAds = adData.length;

                console.log(adData);
                console.log("------> " + averagePrize);

                await this.page.screenshot({ path: 'example.png' });
                await this.browser.close();
                return { date: new Date(), number_of_ads: numberOfAds, average_prize: averagePrize, ads_info: adData };


            }

        } catch (err) {
            console.log(err);
            await this.page.screenshot({ path: 'example.png' });
            await this.browser.close();

            return undefined;
        }
    }

    async initializePuppeteer() {
        if (process.env['RASPBERRY_MODE']) {
            this.browser = await puppeteer.launch({
                executablePath: '/usr/bin/chromium-browser',
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            this.browser = await puppeteer.launch({
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox']
            });
        }
        this.page = await this.browser.newPage();
    }

    async goToNextPage() {
        try {
            const form = await this.page.$x("//a[contains(text(), '>')]");
            if (form.length > 0) {
                await form[0].click();
                await this.page.waitFor(this.timeWaitClick);
                return true;
            } else {
                return false;
            }

        } catch (err) {
            console.log(err);
        }
    }


    async extractPageData() {
        try {
            let data = [];
            const divs = await this.page.$$('div.sui-CardComposable-secondary');
            for (const div of divs) {

                /*
                let divCopy = Object.create(div);
                const spanMeters = await divCopy.$$('span.re-Card-wrapperFeatures')
                let meters = await (await spanMeters[1].getProperty('textContent')).jsonValue();
                meters = meters.replace("m²", "").trim();

                const spanPrize = await div.$('span.re-Card-price>span')
                let prize = await (await spanPrize.getProperty('textContent')).jsonValue();
                prize = prize.replace("€", "").trim();
                */
                try {
                    const content = await this.page.evaluate(el => el.innerHTML, div);

                    const auxPrize = content.split("€")[0]
                    const prize = auxPrize.split("<span>")[auxPrize.split("<span>").length - 1].trim().replace(".", "");

                    const auxMeters = content.split("m²")[0]
                    const meters = auxMeters.split('<span class="re-Card-feature">')[auxMeters.split('<span class="re-Card-feature">').length - 1].trim();

                    if (meters.indexOf("hab") > -1 || prize.indexOf(">") > -1) {
                        throw Error;
                    }
                    const newAdInfo = { prize, meters }
                    data.push(newAdInfo);
                } catch (err) {
                    console.log("error obtaining prize");
                    //console.log(err);
                }

            }

            return data
        } catch (err) {
            console.log(err);
        }


    }

    calculateAverage(adData) {
        let sum = 0;

        for (const data of adData) {
            sum = sum + data.prize / data.meters;
        }

        return sum / adData.length;
    }

    async saveHtml() {
        let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync("./data/htmPage.html", bodyHTML);
    }

    async anyResultsFound() {
        const noResultsClass = "div.re-SearchresultNoResults-text";
        try {
            const div = await this.page.$(noResultsClass);
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text == undefined;
        } catch (err) {
            return true
        }
    }



    async readNumberOfEntries() {
        try {
            const div = await this.page.$('div[style="margin-top: 8px;"]');
            const text = await (await div.getProperty('textContent')).jsonValue();
            await this.page.waitFor(this.timeWaitClick);
            return text.split(" ")[2].trim();
        } catch (err) {
            await this.saveHtml();
            console.log(err);
        }
    }


    async saveData(municipioResults, nmun, cusecName) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
        fs.writeFileSync(nmunPath, JSON.stringify(municipioResults));
        if (this.config.useMongoDb) {
            await this.mongoSaver.saveDataInMongo(municipioResults, nmun, cusecName, this.scrapingIndex);
            // await this.updateStateExecMongo(municipioResults.cusec, nmun, true);
        }
    }


    saveDataAsCSV(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".csv";
        const header = "CUSEC;NMUN;N_ANUN;P_MEDIO;FECHA\n"

    }

    updateIndex(cusecName, nmun) {
        try {
            this.scrapingIndex.municipios[nmun].cusecs[cusecName] = true;
            fs.writeFileSync(this.scrapingIndexPath, JSON.stringify(this.scrapingIndex));
        } catch (err) {
            console.log("error saving index");
            console.log(err);
            throw err;
        }
    }

    async resetIndexAndFinalize() {
        this.featureProcessor.processAllFeaturesAndCreateIndex();
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        if (this.config.useMongoDb) await this.mongoSaver.updateStateExecMongo("none", "none", false);
        this.config.sessionId = "scraping-fotocasa-" + this.config.executionPrefix + "--" + this.date;
        fs.writeFileSync("./data/config/scrapingConfig.json", JSON.stringify(this.config));
    }

}
