const fs = require('fs');
require('dotenv').load();


module.exports = class SummariesFileRecorder {
    constructor(executionId, configPath = "../data/config/scrapingConfig.json") {
        this.config = require(configPath);
        this.executionId = executionId;
        this.tmpDirName = "delete/" + executionId;
        this.mongoUrl = process.env['MONGO_URL'];
        this.MongoClient = require('mongodb').MongoClient;

        const tmpDirName = "delete/" + executionId;

        if (!fs.existsSync("delete")) {
            fs.mkdirSync("delete");
        }
        if (!fs.existsSync(tmpDirName)) {
            fs.mkdirSync(tmpDirName);
        }
        this.appId = this.config.appId;
    }


    saveAllSummariesInDirFromId() {
        const self = this;
        this.MongoClient.connect(this.mongoUrl, function (err, client) {
            if (err) {
                console.log(err);
                reject(err);
            }
            const dbName = self.appId + "-db";
            const collectionName = "summaries-" + self.appId + "-scraping";
            console.log("geting from mongo");
            const collection = client.db(dbName).collection(collectionName);
            let cursor = collection.find({ scrapingId: self.executionId });

            const tmpDirName = self.tmpDirName;
            const convertToCsvString = self.convertToCsvString
            cursor.each(function (err, item) {
                if (item) {
                    const filenameJson = tmpDirName + "/" + item._id + ".json";
                    fs.writeFileSync(filenameJson, JSON.stringify(item));

                    let filenameCsv = tmpDirName + "/" + item._id + ".csv";
                    filenameCsv.replace(",", "");
                    const asCsv = convertToCsvString(item);
                    fs.writeFileSync(filenameCsv, asCsv);
                } else {
                    client.close(); // you may not want to close the DB if you have more code....
                    return;
                    // otherwise, do something with the item
                }

            });
            client.close();
        });
    }

    convertToCsvString(jsonFile) {
        const header = "CUSEC;NMUN;V_VENTA;N_VENTA;FECHA";
        let outputText = header;

        const nmun = jsonFile.nmun;
        const date = jsonFile.date;
        console.log(jsonFile.cusecs);

        for (const cusecName in jsonFile.cusecs) {
            const cusecObj = jsonFile.cusecs[cusecName];
            if (cusecObj) {
                const newLine = cusecName + ";" + nmun + ";" + cusecObj.average_prize + ";" + cusecObj.number_of_ads + ";" + date;
                outputText = outputText + "\n" + newLine;
            }
        }

        return outputText;
    }


}