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
            const boxSizeX = 0.04984999999999973;
            const boxSizeY = 0.04172499999999957;

            const resultX = featureProcessor.calculateNumberRows(boxSizeX);
            const resultY = featureProcessor.calculateNumberRows(boxSizeY);
            console.log("x num : " + resultX);            
            console.log("y num : " + resultY);

            console.log(resultX * featureProcessor.maxSize);
            console.log(boxSizeX);
            console.log("-");

            console.log(resultY * featureProcessor.maxSize);
            console.log(boxSizeY);
            console.log("-");


            assert(resultX !== undefined);
            expect(resultX).to.be.greaterThan(4);
            expect(resultX).to.be.lessThan(31);

        });

        it('with size of Madrid shoud be not null, greater than 4 and less than 31', function () {
            const boxSizeX = 0.30925;
            const boxSizeY = 0.25178100000000114;

            const resultX = featureProcessor.calculateNumberRows(boxSizeX);
            const resultY = featureProcessor.calculateNumberRows(boxSizeY);
            console.log("x num : " + resultX);            
            console.log("y num : " + resultY);

            console.log(resultX * featureProcessor.maxSize);
            console.log(boxSizeX);
            console.log("-");

            console.log(resultY * featureProcessor.maxSize);
            console.log(boxSizeY);
            console.log("-");


            assert(resultX !== undefined);
            expect(resultX).to.be.greaterThan(4);
            expect(resultX).to.be.lessThan(31);

        });


    });
});