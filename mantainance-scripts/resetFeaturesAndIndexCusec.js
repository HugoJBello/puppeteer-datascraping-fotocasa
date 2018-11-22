const FeatureProcessor = require('../FeatureProcessorCusec')
const config = require("../data/config/scrapingConfig.json")
const filterer = new FeatureProcessor("../data/", "../data/separatedFeatures/", config.sessionId);
filterer.processAllFeaturesAndCreateIndex();
