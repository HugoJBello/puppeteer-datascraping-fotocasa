const FeatureProcessor = require('../FeatureProcessorCityBoundingBox')
const config = require("../data/config/scrapingConfig.json")
const filterer = new FeatureProcessor("../data/", "../data/separatedFeatures/", config.sessionId);
(async () => await filterer.processAllFeaturesAndCreateIndex(false))();
