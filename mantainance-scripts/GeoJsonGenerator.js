const fs = require('fs');
require('dotenv').load();

module.exports = class GeoJsonGenerator {
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
    }

    generateGeoJsonsFromResultsPath() {
        fs.readdir(this.scrapingResultsPath, (err, files) => {
            files.forEach(file => {
                if (file.indexOf(".json") > -1) {
                    const scrapingCityResult = require("./" + this.scrapingResultsPath + "/" + file);
                    const geoJson = this.generateGeoJsonFromResult(scrapingCityResult);

                    const geoJsonPath = "./" + this.tmpDirName + "/" + file.replace(".json", ".geojson");
                    console.log(geoJsonPath);
                    fs.writeFileSync(geoJsonPath, JSON.stringify(geoJson));
                    console.log(file);

                }
            });
        })

    }

    generateGeoJsonFromResult(scrapingCityResult) {
        const result = { type: "FeatureCollection", features: [] };
        for (const piece in scrapingCityResult.pieces) {
            console.log(piece);
            const boundingBox = scrapingCityResult.pieces[piece].boundingBox;
            const data = scrapingCityResult.pieces[piece].data;

            const feature = this.generateFeature(boundingBox, data, piece);
            result.features.push(feature);
        }
        return result;
    }

    generateFeature(boundingBox, data, piece) {
        const feature = {
            type: "Feature", properties: {}, bbox: [], geometry: {
                type: "Polygon", coordinates: []
            }
        };
        feature.properties = {name:piece, 
            number_of_ads_buy: data.dataBuy.number_of_ads, 
            average_prize_buy: data.dataBuy.average_prize,
            number_of_ads_rent: data.dataRent.number_of_ads, 
            average_prize_rent: data.dataRent.average_prize,
            date:data.date};

        const bbox = [boundingBox[1][0], boundingBox[1][1], boundingBox[0][0], boundingBox[0][1]];
        const coordinates = [[[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]], [bbox[0], bbox[3]]]]

        feature.bbox = bbox;
        feature.geometry.coordinates = coordinates;
        return feature;
    }



}