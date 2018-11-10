const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const args = process.argv.slice(2);
let id = args[0];

const config = require("../data/config/scrapingConfig.json");
require('dotenv').load();
const mongoUrl = process.env['MONGO_URL'];

if (!id) {
    id = "scraping-fotocasa--11_8_2018,_9_32_27_PM";
}

const tmpDirName = "delete/" + id;

if (!fs.existsSync("delete")) {
    fs.mkdirSync("delete");
}
if (!fs.existsSync(tmpDirName)) {
    fs.mkdirSync(tmpDirName);
}

const appId = config.appId;


MongoClient.connect(mongoUrl, function (err, client) {
    if (err) {
        console.log(err);
        reject(err);
    }
    const dbName = appId + "-db";
    const collectionName = "summaries-" + appId + "-scraping";
    console.log("geting from mongo");
    const collection = client.db(dbName).collection(collectionName);
    let cursor = collection.find({ scrapingId: id });
    // Execute the each command, triggers for each document
    cursor.each(function (err, item) {
        console.log(item);
        if (item == null) {
            client.close(); // you may not want to close the DB if you have more code....
            return;
        }
        // otherwise, do something with the item
    });
    client.close();
});




