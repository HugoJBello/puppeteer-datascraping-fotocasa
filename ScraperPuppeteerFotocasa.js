const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const fs = require('fs');
require('dotenv').load();

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
        this.MongoClient = require('mongodb').MongoClient;

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
        for (let nmun in this.separatedFeatures) {
            console.log("-----------------------\n Scraping data from " + nmun + "\n-----------------------");
            let municipioResults = await this.initializeMunicipio(nmun);
            for (let cusecName in this.separatedFeatures[nmun]) {
                console.log("\n------->" + cusecName)
                this.initializeConfigAndIndex();
                if (!this.scrapingIndex[nmun][cusecName]) {
                    let cusecFeature = this.separatedFeatures[nmun][cusecName];
                    const cusecData = await this.extractFromCusec(cusecFeature);
                    municipioResults.cusecs[cusecName] = cusecData;

                    this.updateIndex(cusecName, nmun);
                    await this.saveData(municipioResults, nmun);
                }
            }
        }

        this.resetIndexAndFinalize();
    }

    async initializeMunicipio(nmun) {
        if (!fs.existsSync(this.tmpDirSession)) {
            fs.mkdirSync("./" + this.tmpDirSession);
        }
        if (this.config.useMongoDb) {
            let municipio = await this.getMunicipioFromMongo(nmun);
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

    async getMunicipioFromMongo(nmun) {
        const self = this;
        const url = this.mongoUrl;
        const scrapingId = this.config.sessionId;
        return new Promise((resolve, reject) => {
            self.MongoClient.connect(url, function (err, client) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                const dbName = "airbnb-db";
                const collectionName = "summaries-airbnb-scraping";
                console.log("geting from mongo");
                const collection = client.db(dbName).collection(collectionName);
                const _id = nmun + "---" + scrapingId;
                console.log(_id);
                collection.findOne({ _id }, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    console.log(result);
                    resolve(result);
                });
                client.close();
            });
        });
    }

    initializeConfigAndIndex() {
        this.config = require("./data/config/scrapingConfig.json");
        this.scrapingIndex = require("./data/separatedFeatures/scrapingIndex.json");
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
                while (isNextPage) {
                    console.log("-->scraping page " + pageNum);
                    const pageData = await this.extractPageData();

                    adData.push(...pageData);
                    //console.log("found " + numberOfEntries + " entries in this page");
                    isNextPage = await this.goToNextPage();
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
            await this.saveDataInMongo(municipioResults, nmun, cusecName);
            // await this.updateStateExecMongo(municipioResults.cusec, nmun, true);
        }
    }

    async saveDataInMongo(municipioResults, nmun, cusecName) {
        const scrapingId = this.config.sessionId
        await this.MongoClient.connect(this.mongoUrl, function (err, client) {
            const db = "fotocasa-db";
            const collectionName = "summaries-fotocasa-scraping";
            console.log("saving data in mongodb");
            const collection = client.db(db).collection(collectionName);
            collection.save(municipioResults);

            const dbIndex = "fotocasa-db";
            const collectionNameIndex = "state-execution-fotocasa-scraping";
            console.log("updating log in mongodb");
            const executionDataLogIndex = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: true, lastNmun: nmun, lastCusec: cusecName }
            const collectionIndex = client.db(dbIndex).collection(collectionNameIndex);
            collectionIndex.save(executionDataLogIndex);
            client.close();
        });
    }

    async updateStateExecMongo(cusecName, nmun, active) {
        const scrapingId = this.config.sessionId
        const url = this.mongoUrl;
        await this.MongoClient.connect(url, function (err, client) {
            const dbIndex = "index-fotocasa-db";
            const collectionNameIndex = "state-execution-fotocasa-scraping";
            console.log("updating log in mongodb");
            const executionDataLogIndex = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: active, lastNmun: nmun, lastCusec: cusecName }
            const collectionIndex = client.db(dbIndex).collection(collectionNameIndex);
            collectionIndex.save(executionDataLogIndex);
            client.close();
        });
    }
    saveDataAsCSV(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".csv";
        const header = "CUSEC;NMUN;N_ANUN;P_MEDIO;FECHA\n"

    }

    updateIndex(cusecName, nmun) {
        this.scrapingIndex[nmun][cusecName] = true;
        fs.writeFileSync(this.scrapingIndexPath, JSON.stringify(this.scrapingIndex));
    }

    async resetIndexAndFinalize() {
        const FeatureProcessor = require('./FeatureProcessor');
        const featureProcessor = new FeatureProcessor();
        featureProcessor.processAllFeaturesAndCreateIndex();
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        if (this.config.saveDataInMongo) await this.updateStateExecMongo("none", "none", false);
        this.config.sessionId = "scraping-fotocasa-" + this.config.executionPrefix + "--" + this.date;
        fs.writeFileSync("./data/config/scrapingConfig.json", JSON.stringify(this.config));
    }

}
