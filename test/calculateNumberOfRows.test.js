const chai = require('chai');
const FeatureProcessorCityBoundingBox = require('../FeatureProcessorCityBoundingBox');
const assert = chai.assert;
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost(0.01));

const expect = chai.expect;
describe('App', function () {
    describe('test that the calculation of number of rows works', async function () {
        const featureProcessor = new FeatureProcessorCityBoundingBox();
        //boxsize mostoles
        const boxSize = 0.04172499999999957;

        const result = featureProcessor.calculateNumberRows(boxSize);

        it('shoud be not null, greater than 3 and less than 10', function () {

            assert(result !== undefined);
            expect(result).to.be.greaterThan(3);
            expect(result).to.be.lessThan(10);

        });


    });
});