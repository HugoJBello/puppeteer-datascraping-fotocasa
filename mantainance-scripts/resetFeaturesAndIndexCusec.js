const FeatureProcessor = require('../FeatureProcessor')
const config = require("../data/config/scrapingConfig.json")
const filterer = new FeatureProcessor("../data/", "../data/separatedFeatures/", config.sessionId);
filterer.processAllFeaturesAndCreateIndex();
