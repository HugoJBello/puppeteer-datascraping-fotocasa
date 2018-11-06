const FeatureProcessor = require('../FeatureProcessor')

const filterer = new FeatureProcessor("../data/", "../data/separatedFeatures/");
filterer.processAllFeaturesAndCreateIndex();
