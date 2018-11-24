const chai = require('chai');
const FeatureProcessorCityBoundingBox = require('../FeatureProcessorCityBoundingBox');
const assert = chai.assert;
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost(0.01));

const expect = chai.expect;
describe('App', function () {
    describe('test the popullation of small bounding boxes from big bounding box in municipio', async function () {
        const featureProcessor = new FeatureProcessorCityBoundingBox();
        const boundingBoxTest = [['0', '1'], ['1', '0']]

        const result = featureProcessor.popullateBoundingBoxWithPieces(boundingBoxTest, 1,1,3,4).childrenSmallBoxes;

        it('shoud be not null', function () {
            console.log("test box");
            console.log(boundingBoxTest);
            console.log("result box");
            console.log(result);

            assert(result !== null);
        });

        it('last coord y with test box should be close to 0', function () {
            console.log("test box");
            console.log(boundingBoxTest);

            const lastKey = Object.keys(result)[Object.keys(result).length - 1]
            const lastBox = result[lastKey].boundingBox;
            const lastCoord = lastBox[1][1]
            console.log("last coord in result pupullated box: " + lastCoord);
            expect(lastCoord).to.almost.equal(0);


        });
    });
});