
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

        this.nMuns = ["Móstoles"];
        this.outputDir = outputDir;
        this.outputFilenameFeatures = this.outputDir + "separatedFeaturesBB.json";
        this.outputFilenameIndex = this.outputDir + "scrapingIndexBB.json";
        this.scraper = new ExtractBoundingBoxScraper();
        this.maxSize = 0.005;
    }

    processAllFeaturesAndCreateIndex() {
        this.generateProcessedFeaturesAndIndex();
        this.saveInFile();
        //console.log(this.foundFeatures);
    }

    async generateProcessedFeaturesAndIndex() {
        this.scrapingIndex = { "_id": this.sessionId, municipios: {} };
        this.foundFeatures = {};

        for (const nmun of this.nMuns) {
            const boundingBox = await this.scraper.extractBoundingBoxFromCityName(nmun);
            this.scrapingIndex.municipios[nmun] = {}
            const bbId = "mun--" + boundingBox.toString();
            this.scrapingIndex.municipios[nmun][bbId] = {}
            const length = 10;
            this.popullateBoundingBoxWithPieces(nmun, bbId, boundingBox, length);
        }

    }

    popullateBoundingBoxWithPieces(nmun, bbId, boundingBox, length) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < length; j++) {
                const newBox00 = parseFloat(boundingBox[0][0]) + (i / length) * parseFloat(boundingBox[1][0]);
                const newBox01 = parseFloat(boundingBox[0][1]) + (j / length) * parseFloat(boundingBox[1][1]);

                const newBox10 = newBox00 + 1 / length;
                const newBox11 = newBox01 - 1 / length;
                const box = [[newBox00, newBox01], [newBox10, newBox11]]
                console.log(box);
                const boxId = "piece--" + box.toString();
                this.scrapingIndex.municipios[nmun][bbId][boxId] = box;
            }
        }

    }

    saveInFile() {

    }


}


