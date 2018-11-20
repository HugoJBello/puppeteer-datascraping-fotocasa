const chai = require('chai');
const ExtractBoundingBoxScraper = require('../ExtractBoundingBoxScraper');
const assert = chai.assert;

const expect = chai.expect;
describe('App', function () {
    this.timeout(150000);

    describe('test that ExtractBoundingBoxScraper scraps data from Madrid', async function () {
        const scraper = new ExtractBoundingBoxScraper();
        const result = await scraper.extractBoundingBoxFromCityName('Madrid');
        assert(result !== null);
    });

});