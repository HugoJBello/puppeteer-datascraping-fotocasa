const chai = require('chai');
const ExtractBoundingBoxScraper = require('../ExtractBoundingBoxScraper');
const assert = chai.assert;

const expect = chai.expect;
describe('App', function () {
    this.timeout(150000);

    describe('test that ExtractBoundingBoxScraper scraps data from Móstoles and Madrid', async function () {
        const scraper = new ExtractBoundingBoxScraper();

        it('scraping results Móstoles shoud be not null', async function () {
            const result = await scraper.extractBoundingBoxFromCityName('Móstoles');
            assert(result !== null);
        });

        it('scraping results Mostoles shoud be not null', async function () {
            const result = await scraper.extractBoundingBoxFromCityName('Mostoles');
            assert(result !== null);
        });

        it('scraping results Madrid shoud be not null', async function () {
            const result = await scraper.extractBoundingBoxFromCityName('Madrid');
            assert(result !== null);
        });
    });

});