const fs = require('fs');
const GeoJsonGeneratorFromResult = require("./GeoJsonGeneratorFromResult")
require('dotenv').load();

module.exports = class GeoJsonTranslator {
    constructor(executionId) {
        this.executionId = executionId;
        this.scrapingResultsPath = "delete/" + executionId;

        this.tmpDirName = "geoJsonFiles/" + executionId;

        if (!fs.existsSync("geoJsonFiles")) {
            fs.mkdirSync("geoJsonFiles");
        }
        if (!fs.existsSync(this.tmpDirName)) {
            fs.mkdirSync(this.tmpDirName);
        }

        this.generator = new GeoJsonGeneratorFromResult();

    }

    generateGeoJsonsFromResultsPath() {
        fs.readdir(this.scrapingResultsPath, (err, files) => {
            files.forEach(file => {
                if (file.indexOf(".json") > -1) {
                    const scrapingCityResult = require("./" + this.scrapingResultsPath + "/" + file);
                    const geoJson = this.generator.generateGeoJsonFromResult(scrapingCityResult);

                    const geoJsonPath = "./" + this.tmpDirName + "/" + file.replace(".json", ".geojson");
                    console.log(geoJsonPath);
                    fs.writeFileSync(geoJsonPath, JSON.stringify(geoJson));
                    console.log(file);

                }
            });
        })

    }





}