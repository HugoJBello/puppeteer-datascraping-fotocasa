this.MongoClient = require('mongodb').MongoClient;

module.exports = class MongoDAO {
    constructor(mongoUrl, appId, config) {
        this.mongoUrl = mongoUrl,
            this.appId = appId,
            this.config = config
        this.MongoClient = require('mongodb').MongoClient;

    }
    async getMunicipioFromMongo(nmun) {
        const self = this;
        const url = this.mongoUrl;
        const scrapingId = this.config.sessionId;
        const appId = this.appId;
        return new Promise((resolve, reject) => {
            self.MongoClient.connect(url, function (err, client) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                const dbName = appId + "-db";
                const collectionName = "summaries-" + appId + "-scraping";
                console.log("geting from mongo");
                const collection = client.db(dbName).collection(collectionName);
                const _id = nmun + "---" + scrapingId;
                console.log(_id);
                collection.findOne({ _id }, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    console.log(result);
                    resolve(result);
                });
                client.close();
            });
        });
    }

    async getIndexFromMongo() {
        const appId = this.appId;
        const scrapingId = this.config.sessionId;
        return new Promise((resolve, reject) => {

            this.MongoClient.connect(this.mongoUrl, function (err, client) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                const dbName = appId + "-db";
                const collectionName = "index-" + appId + "-scraping";
                console.log("geting from mongo");
                const collection = client.db(dbName).collection(collectionName);
                const _id = scrapingId;
                console.log(_id);
                collection.findOne({ _id }, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    console.log(result);
                    resolve(result);
                });
                client.close();

            });
        });
    }

    async saveDataInMongo(municipioResults, nmun, cusecName, scrapingIndex) {
        const scrapingId = this.config.sessionId;
        const index = scrapingIndex;
        const appId = this.appId;
        await this.MongoClient.connect(this.mongoUrl, function (err, client) {
            if (err) {
                console.log(err);
                throw err;
            }
            const db = appId + "-db";
            const collectionName = "summaries-" + appId + "-scraping";
            console.log("saving data in mongodb");
            const collection = client.db(db).collection(collectionName);
            collection.save(municipioResults);

            const collectionNameStatus = "state-execution-" + appId + "-scraping";
            console.log("updating log in mongodb");
            const executionDataLogStatus = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: true, lastNmun: nmun, lastCusec: cusecName }
            const collectionStatus = client.db(db).collection(collectionNameStatus);
            collectionStatus.save(executionDataLogStatus);

            const collectionNameIndex = "index-" + appId + "-scraping";
            console.log("updating log in mongodb");
            const collectionIndex = client.db(db).collection(collectionNameIndex);
            collectionIndex.save(index);
            client.close();
        });
    }

    async updateIndexInMongo(scrapingIndex) {
        const scrapingId = this.config.sessionId;
        const index = scrapingIndex;
        const appId = this.appId;
        await this.MongoClient.connect(this.mongoUrl, function (err, client) {
            if (err) {
                console.log(err);
                throw err;
            }
            const db = appId + "-db";
            const collectionNameIndex = "index-" + appId + "-scraping";
            console.log("updating index in mongodb");
            const collectionIndex = client.db(db).collection(collectionNameIndex);
            collectionIndex.save(index);
            client.close();
        });
    }


    async updateStateExecMongo(cusecName, nmun, active) {
        const scrapingId = this.config.sessionId
        const url = this.mongoUrl;
        await this.MongoClient.connect(url, function (err, client) {
            if (err) {
                console.log(err);
                throw err;
            }
            try {
                const dbIndex = "index-" + this.appId + "-db";
                const collectionNameIndex = "state-execution-" + this.appId + "-scraping";
                console.log("updating log in mongodb");
                const executionDataLogIndex = { "_id": scrapingId, scrapingId: scrapingId, date: new Date(), active: active, lastNmun: nmun, lastCusec: cusecName }
                const collectionIndex = client.db(dbIndex).collection(collectionNameIndex);
                collectionIndex.save(executionDataLogIndex);
                client.close();
            } catch (err) {
                console.log(err);
                console.log("error saving in mongo");
                throw err
            }

        });
    }




}