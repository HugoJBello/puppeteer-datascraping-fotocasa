
const fs = require('fs');


module.exports = class FeatureProcessor {
    constructor(mapDir = "./data/", outputDir = "./data/separatedFeatures/", sessionId = "id") {
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
        this.foundFeatures = {};
        this.sessionId = sessionId;
        this.fileContents = fs.readFileSync(mapDir + "SECC_CPV_E_20111101_01_R_INE_MADRID_cs_epsg.geojson.json", 'utf8');
        this.geoJson = JSON.parse(this.fileContents);

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

        for (let feature of this.geoJson["features"]) {
            if (this.nMuns.includes(feature.properties["NMUN"])) {
                let procFeature = this.processFeature(feature);
                if (feature.properties["NMUN"] in this.foundFeatures) {
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex.municipios[feature.properties["NMUN"]].cusecs[procFeature.cusec] = false;
                } else {
                    this.foundFeatures[feature.properties["NMUN"]] = {};
                    this.scrapingIndex.municipios[feature.properties["NMUN"]] = { scraped: false, cusecs: {} };
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex.municipios[feature.properties["NMUN"]].cusecs[procFeature.cusec] = false;

                }
            }
        }
    }

    processFeature(feature) {
        let processedFeature = {};
        processedFeature["nmun"] = feature.properties["NMUN"];
        processedFeature["cusec"] = feature.properties["CUSEC"];
        //processedFeature["coordinates"] = feature["geometry"].coordinates;
        //processedFeature["type"] = feature["geometry"].type;
        const boundingBox = this.getBoundingBox(feature["geometry"].coordinates, feature["geometry"].type);
        processedFeature["boundingBox"] = boundingBox;
        const centerPoint = this.getCenterPoint(boundingBox);
        processedFeature["centerPoint"] = centerPoint;
        return processedFeature;

    }

    getBoundingBox(coordinates, type) {
        if (type === "MultiPolygon") {
            let maxX = -180;
            let maxY = -180;
            let minX = 180;
            let minY = 180;
            /*
            let boundingBox = [coordinates[0][0][0], coordinates[0][0][0]];
            //console.log("\n------------------------------");
            //console.log(coordinates[0][0]);
            const reducer = (currentBBox, currentValue) => {
                return [
                    [Math.min(currentValue[0], currentBBox[0][0]), Math.max(currentValue[1], currentBBox[0][1])],
                    [Math.max(currentValue[0], currentBBox[1][0]), Math.min(currentValue[1], currentBBox[1][1])]
                ]
            }
            return coordinates[0][0].reduce(reducer, boundingBox);
            */
            for (const point of coordinates[0][0]) {
                maxX = Math.max(point[0], maxX);
                maxY = Math.max(point[1], maxY);
                minX = Math.min(point[0], minX);
                minY = Math.min(point[1], minY);
            }
            return [[minX, maxY], [maxX, minY]];
        }
    }
    getCenterPoint(boundingBox) {
        return [(boundingBox[0][0] + boundingBox[1][0]) / 2, (boundingBox[0][1] + boundingBox[1][1]) / 2]
    }

    saveInFile() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        fs.writeFileSync(this.outputFilenameFeatures, JSON.stringify(this.foundFeatures));
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }
}


