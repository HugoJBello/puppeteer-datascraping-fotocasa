
const fs = require('fs');
const FeatureProcessorBoundingBox = require('./FeatureProcessorCityBoundingBox');
const BoxScraper = require('./FotocasaBoxScraper');
const MongoSaver = require('./MongoDAO');

module.exports = class ScraperPuppeteerFotocasaBoundingBox {
    constructor() {
        require('dotenv').load();

        this.mongoUrl = process.env['MONGO_URL'];
        this.retries = 3;

        this.separatedFeaturesPath = "./data/separatedFeatures/separatedFeaturesBB.json";
        this.separatedFeatures = require(this.separatedFeaturesPath);
        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndexBB.json";
        this.scrapingIndex = require(this.scrapingIndexPath);

        this.configPath = "./data/config/scrapingConfig.json"
        this.config = require(this.configPath);
        this.featureProcessor = new FeatureProcessorBoundingBox();
        this.featureProcessor.sessionId = this.config.sessionId;

        this.boxScraper = new BoxScraper();
        this.appId = "fotocasa";
        this.mongoSaver = new MongoSaver(this.mongoUrl, this.appId, this.config);

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
        for (let cityName in this.separatedFeatures.cities) {
            console.log("-----------------------\n Scraping data from " + cityName + "\n-----------------------");
            if (!this.scrapingIndex.cities[cityName].scraped) {
                let cityResults = await this.initializeMunicipio(cityName);
                for (let pieceName in this.separatedFeatures.cities[cityName].pieces) {
                    console.log("\n------->" + pieceName)
                    if (!this.scrapingIndex.cities[cityName].pieces[pieceName]) {
                        try {
                            let piece = this.separatedFeatures.cities[cityName].pieces[pieceName];
                            const scrapedData = await this.extractDataFromPieceBox(piece);
                            cityResults.pieces[pieceName] = { data: scrapedData, boundingBox: this.separatedFeatures.cities[cityName].pieces[pieceName].boundingBox };

                            this.updateIndex(pieceName, cityName);
                            await this.saveData(cityResults, cityName, pieceName);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                }
                this.scrapingIndex.cities[cityName].scraped = true;
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
                municipio = this.getNewCityRegistry(nmun);
            }
            return municipio;
        } else {
            let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
            if (fs.existsSync(nmunPath)) {
                return require("./" + nmunPath);
            } else {
                return this.getNewCityRegistry(nmun);
            }
        }
    }

    getNewCityRegistry(nmun) {
        return { _id: nmun + "---" + this.config.sessionId, cityName: nmun, scrapingId: this.config.sessionId, date: new Date(), pieces: {} }
    }


    async initializeConfigAndIndex() {
        this.config = require(this.configPath);
        if (this.config.useMongoDb) {
            this.scrapingIndex = await this.mongoSaver.getIndexFromMongo();
            if (!this.scrapingIndex) {
                console.log("------\n initializing index");
                await this.featureProcessor.processAllFeaturesAndCreateIndex(this.config.useSavedFeaturesInFile);
                this.scrapingIndex = this.featureProcessor.scrapingIndex;
            }
        } else {
            this.scrapingIndex = require(this.scrapingIndexPath);
        }
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
    }


    async extractDataFromPieceBox(piece) {
        try {
            const boundingBox = piece.boundingBox;
            const centerPoint = piece.centerPoint;

            const boxScraperResultsBuy = await this.boxScraper.extractDataFromBox(boundingBox, centerPoint, "comprar");
            const dataBuy = { number_of_ads: boxScraperResultsBuy.numberOfAds, average_prize: boxScraperResultsBuy.averagePrize, ads_info: boxScraperResultsBuy.adData }

            const boxScraperResultsRent = await this.boxScraper.extractDataFromBox(boundingBox, centerPoint, "alquiler");
            const dataRent = { number_of_ads: boxScraperResultsRent.numberOfAds, average_prize: boxScraperResultsRent.averagePrize, ads_info: boxScraperResultsRent.adData }

            return { date: new Date(), dataBuy, dataRent };

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
            this.scrapingIndex.cities[nmun].pieces[cusecName] = true;
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
        this.config.sessionId = "scraping-fotocasa-" + this.config.deviceId + "--" + this.date;
        fs.writeFileSync(this.configPath, JSON.stringify(this.config));
    }

}
