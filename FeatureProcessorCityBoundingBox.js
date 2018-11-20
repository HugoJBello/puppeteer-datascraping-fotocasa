
const fs = require('fs');


module.exports = class FeatureProcessorCusec {
    constructor(mapDir = "./data/", outputDir = "./data/separatedFeatures/", sessionId = "id") {


        this.outputDir = outputDir;
        this.outputFilenameFeatures = this.outputDir + "separatedFeatures.json";
        this.outputFilenameIndex = this.outputDir + "scrapingIndex.json";
    }

    processAllFeaturesAndCreateIndex() {
        this.generateProcessedFeaturesAndIndex();
        this.saveInFile();
        //console.log(this.foundFeatures);
    }

    generateProcessedFeaturesAndIndex() {
        this.scrapingIndex = { "_id": this.sessionId, municipios: {} };

    }

    getBoundingBox(coordinates, type) {

    }

}


