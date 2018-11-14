
const fs = require('fs');
const FeatureProcessor = require('./FeatureProcessor');
const BoxScraper = require('./FotocasaBoxScraper');
const MongoSaver = require('./MongoDAO');

module.exports = class ScraperPuppeteerFotocasa {
    constructor() {
        require('dotenv').load();

        this.mongoUrl = process.env['MONGO_URL'];
        this.retries = 3;
        this.separatedFeatures = require("./data/separatedFeatures/separatedFeatures.json");
        this.config = require("./data/config/scrapingConfig.json");
        this.featureProcessor = new FeatureProcessor();
        this.featureProcessor.sessionId = this.config.sessionId;

        this.boxScraper = new BoxScraper();
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

            const boxScraperResults = await this.boxScraper.extractDataFromBox(boundingBox, centerPoint);
            return { date: new Date(), number_of_ads: boxScraperResults.numberOfAds, average_prize: boxScraperResults.averagePrize, ads_info: boxScraperResults.adData };

        } catch (err) {
            console.log(err);
            return undefined;
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
