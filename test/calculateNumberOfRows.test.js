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



        it('with size of Mostoles shoud be not null, greater than 4 and less than 31', function () {
            const boxSize = 0.04172499999999957;
            const result = featureProcessor.calculateNumberRows(boxSize);
            console.log(result);
            assert(result !== undefined);
            expect(result).to.be.greaterThan(4);
            expect(result).to.be.lessThan(31);

        });

        it('with size of Madrid shoud be not null, greater than 4 and less than 31', function () {
            const boxSize = 0.31;
            const result = featureProcessor.calculateNumberRows(boxSize);
            console.log(result);
            assert(result !== undefined);
            expect(result).to.be.greaterThan(4);
            expect(result).to.be.lessThan(31);

        });


    });
});