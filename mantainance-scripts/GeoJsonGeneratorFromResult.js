

module.exports = class GeoJsonGeneratorFromResult {
    constructor() {
        this.maxOpacity = 0.8;
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

    //modeoutpu can be "buy-prize" "buy-ads" "rent-prize" or "rent-ads", first param is buy/rent second if we want to display
    // number of ads or average prize. This will set the stiles of the geojson
    generateFeature(boundingBox, data, piece, maxValues, modeOutput = "buy-prize") {
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
                    normalized_prize_buy: (data.dataBuy.average_prize / maxValues.maxPrizeBuy),
                    normalized_ads_buy: (data.dataBuy.number_of_ads / maxValues.maxNumberAdsBuy),
                    normalized_prize_rent: (data.dataRent.average_prize / maxValues.maxPrizeRent),
                    normalized_ads_rent: (data.dataRent.number_of_ads / maxValues.maxNumberAdsRent),
                    date: data.date
                };
            } else {
                feature.properties = {
                    name: piece,
                    number_of_ads_rent: data.number_of_ads,
                    average_prize_rent: data.average_prize,
                    normalized_prize_rent: (data.average_prize / maxValues.maxPrizeRent),
                    normalized_ads_rent: (data.number_of_ads / maxValues.maxNumberAdsRent),
                    date: data.date
                };
            }
        }


        if (modeOutput === "buy-prize") {
            feature.properties["fill-opacity"] = feature.properties.normalized_prize_buy * this.maxOpacity;
        } else if (modeOutput === "buy-ads") {
            feature.properties["fill-opacity"] = feature.properties.normalized_ads_buy * this.maxOpacity;
        } else if (modeOutput === "rent-prize") {
            feature.properties["fill-opacity"] = feature.properties.normalized_prize_rent * this.maxOpacity;
        } else {
            feature.properties["fill-opacity"] = feature.properties.normalized_ads_rent * this.maxOpacity;
        }
        feature.properties.fill = "#ff0000";

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