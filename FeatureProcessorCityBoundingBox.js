
const fs = require('fs');
const ExtractBoundingBoxScraper = require('./ExtractBoundingBoxScraper')

module.exports = class FeatureProcessorCusec {
    constructor(mapDir = "./data/", outputDir = "./data/separatedFeatures/", sessionId = "id") {
        /*
        this.nMuns = ["Madrid", "Móstoles", "Alcalá de Henares",
            "Fuenlabrada", "Leganés", "Getafe",
            "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
            "Las Rozas de Madrid", "San Sebastián de los Reyes",
            "Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid",
            "Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez",
            "Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo",
            "Tres Cantos", "San Fernando de Henares", "Galapagar", "Arroyomolinos",
            "Villaviciosa de Odón", "Navalcarnero", "Ciempozuelos", "Torrelodones",
            "Paracuellos de Jarama", "Mejorada del Campo", "Algete"]
        */

        this.cities = ["Móstoles"];
        this.outputDir = outputDir;
        this.outputFilenameFeatures = this.outputDir + "separatedFeaturesBB.json";
        this.outputFilenameIndex = this.outputDir + "scrapingIndexBB.json";
        this.scraper = new ExtractBoundingBoxScraper();
        this.maxSize = 0.005;

        this.scrapingIndex = null;
        this.foundFeatures = null;
    }

    async processAllFeaturesAndCreateIndex(generateOnlyIndex = false) {
        if (generateOnlyIndex) {
            await this.generateIndexFromFeatures();
        } else {
            await this.generateProcessedFeaturesAndIndex();
            this.saveInFile();
        }
        //console.log(this.foundFeatures);
    }

    async generateProcessedFeaturesAndIndex() {
        this.scrapingIndex = { "_id": this.sessionId, cities: {} };
        this.foundFeatures = { cities: {} };

        for (const cityName of this.cities) {
            const boundingBox = await this.scraper.extractBoundingBoxFromCityName(cityName);
            this.foundFeatures.cities[cityName] = { boundingBox: boundingBox, pieces: {} }
            this.scrapingIndex.cities[cityName] = { scraped: false, pieces: {} }

            const length = 10;
            const boxCreationResult = this.popullateBoundingBoxWithPieces(boundingBox, length)
            this.foundFeatures.cities[cityName]["pieces"] = boxCreationResult.childrenSmallBoxes;
            this.scrapingIndex.cities[cityName]["pieces"] = boxCreationResult.childrenSmallBoxesNamesIndex;
        }

    }

    popullateBoundingBoxWithPieces(boundingBox, length) {
        let childrenSmallBoxes = {}
        let childrenSmallBoxesNamesIndex = {}
        const distX = parseFloat(boundingBox[1][0]) - parseFloat(boundingBox[0][0]);
        const distY = parseFloat(boundingBox[0][1]) - parseFloat(boundingBox[1][1]);

        for (let i = 0; i < length; i++) {
            for (let j = 0; j < length; j++) {

                const newBox00 = parseFloat(boundingBox[0][0]) + (i / length) * distX;
                const newBox01 = parseFloat(boundingBox[0][1]) - (j / length) * distY;
                const newBox10 = newBox00 + (1 / length) * distX;
                const newBox11 = newBox01 - (1 / length) * distY;

                const box = [[newBox00, newBox01], [newBox10, newBox11]]
                const pieceBoxId = "piece--" + i + "-" + j;
                childrenSmallBoxes[pieceBoxId] = {
                    boundingBox: box, centerPoint: this.getCenterPoint(box)
                };
                childrenSmallBoxesNamesIndex[pieceBoxId] = false;
            }
        }
        return { childrenSmallBoxes, childrenSmallBoxesNamesIndex };
    }

    getCenterPoint(boundingBox) {
        return [(boundingBox[0][0] + boundingBox[1][0]) / 2, (boundingBox[0][1] + boundingBox[1][1]) / 2]
    }

    //simplifies the previous process, obtains only index.
    generateIndexFromFeatures() {
        this.foundFeatures = require(this.outputFilenameFeatures);
        this.scrapingIndex = { "_id": this.sessionId, cities: {} };
        for (const city in this.foundFeatures.cities) {
            this.scrapingIndex.cities[city] = { scraped: false, pieces: {} }
            for (const piece in this.foundFeatures.cities[city].pieces) {
                this.scrapingIndex.cities[city].pieces[piece] = false;
            }
        }
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }

    saveInFile() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        fs.writeFileSync(this.outputFilenameFeatures, JSON.stringify(this.foundFeatures));
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }


}


