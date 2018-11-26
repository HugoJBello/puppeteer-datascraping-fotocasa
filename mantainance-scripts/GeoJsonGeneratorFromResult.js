

module.exports = class GeoJsonGeneratorFromResult {
    constructor() {

    }

    generateGeoJsonFromResult(scrapingCityResult) {
        const result = { type: "FeatureCollection", features: [] };
        const maxValues = this.calculateMaxValues(scrapingCityResult.pieces);
        console.log(maxValues);
        for (const piece in scrapingCityResult.pieces) {
            console.log(piece);
            const boundingBox = scrapingCityResult.pieces[piece].boundingBox;
            const data = scrapingCityResult.pieces[piece].data;

            const feature = this.generateFeature(boundingBox, data, piece, maxValues);
            result.features.push(feature);
        }
        return result;
    }

    generateFeature(boundingBox, data, piece, maxValues) {
        const feature = {
            type: "Feature", properties: {}, bbox: [], geometry: {
                type: "Polygon", coordinates: []
            }
        };

        if (data) {
            if (data.dataBuy) {
                feature.properties = {
                    name: piece,
                    number_of_ads_buy: data.dataBuy.number_of_ads,
                    average_prize_buy: data.dataBuy.average_prize,
                    number_of_ads_rent: data.dataRent.number_of_ads,
                    average_prize_rent: data.dataRent.average_prize,
                    date: data.date
                };
            } else {
                feature.properties = {
                    name: piece,
                    number_of_ads: data.number_of_ads,
                    average_prize: data.average_prize,
                    date: data.date
                };
            }
        }

        const normalizedPrizeBuy = (feature.properties.average_prize_buy / maxValues.maxPrizeBuy)
        feature.properties.fill = "#555555";
        feature.properties["fill-opacity"] = normalizedPrizeBuy * 0.8;
        /*
        feature.geometry.style = {
            "stroke-width": "3",
            "fill-opacity": 0.2
        }
        */



        const bbox = [boundingBox[1][0], boundingBox[1][1], boundingBox[0][0], boundingBox[0][1]];
        const coordinates = [[[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]], [bbox[0], bbox[3]]]]

        feature.bbox = bbox;
        feature.geometry.coordinates = coordinates;
        return feature;
    }

    calculateMaxValues(pieces) {
        let maxPrizeRent = 0;
        let maxPrizeBuy = 0;
        let maxNumberAdsRent = 0;
        let maxNumberAdsBuy = 0;
        for (const pieceName in pieces) {
            const piece = pieces[pieceName];
            if (piece.data) {
                if (piece.data.dataBuy) {
                    maxPrizeBuy = Math.max(maxPrizeBuy, piece.data.dataBuy.average_prize);
                    maxPrizeRent = Math.max(maxPrizeRent, piece.data.dataRent.average_prize);
                    maxNumberAdsBuy = Math.max(maxNumberAdsBuy, piece.data.dataBuy.number_of_ads);
                    maxNumberAdsRent = Math.max(maxNumberAdsBuy, piece.data.dataRent.number_of_ads);
                } else {
                    maxPrizeRent = Math.max(maxPrizeRent, piece.data.average_prize);
                    maxNumberAdsRent = Math.max(maxNumberAdsBuy, piece.data.dataRent.number_of_ads);
                }
            }
        }
        return { maxNumberAdsBuy, maxNumberAdsRent, maxPrizeBuy, maxPrizeRent };
    }
}