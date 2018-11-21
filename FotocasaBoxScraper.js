const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');


module.exports = class FocotasaBoxScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.config = require("./data/config/scrapingConfig.json");

        this.timeWaitStart = 1 * 1000;
        this.timeWaitClick = 500;
    }

    async extractDataFromBox(boundingBox, centerPoint, type = "comprar") {
        //type can be comprar o alquiler
        console.log("--extracting data for type:" + type + " in url:")
        const url = `https://www.fotocasa.es/es/${type}/casas/espana/tu-zona-de-busqueda/l?latitude=40&longitude=-4&combinedLocationIds=724,0,0,0,0,0,0,0,0&gridType=list&mapBoundingBox=${boundingBox[0][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[1][1]};&latitudeCenter=${centerPoint[1]}&longitudeCenter=${centerPoint[0]}&zoom=16`

        console.log("\n---");
        console.log(url);
        console.log("---");

        await this.initializePuppeteer();
        await this.page.goto(url);
        await this.page.waitFor(this.timeWaitStart);
        let results = {}
        let adData;
        try {
            if (await this.anyResultsFound()) {
                let numberOfEntries;
                //numberOfEntries = await this.extractNumberOfEntries();

                adData = [];
                let isNextPage = true;
                let pageNum = 1;
                let pageLimit = this.config.pageLimit;
                while (isNextPage) {
                    console.log("-->scraping page " + pageNum);
                    try {
                        const pageData = await this.extractPageData();
                        adData.push(...pageData);
                    } catch (err) {
                        console.log("error obtaining data for page");
                        console.log(err);
                    }

                    //console.log("found " + numberOfEntries + " entries in this page");
                    isNextPage = (await this.goToNextPage() && (pageNum < pageLimit));
                    pageNum = pageNum + 1;
                }

                let averagePrize = this.calculateAverage(adData);
                let numberOfAds = adData.length;

                console.log(adData);
                console.log("------> " + averagePrize);

                await this.page.screenshot({ path: 'example.png' });
                await this.browser.close();
                return { averagePrize, numberOfAds, adData };
            }
        } catch (err) {
            console.log(err);
            await this.page.screenshot({ path: 'example.png' });
            await this.browser.close();
            return { numberOfAds: undefined, averagePrize: undefined, adData: undefined };
        }
    }

    async initializePuppeteer() {
        if (process.env['RASPBERRY_MODE']) {
            this.browser = await puppeteer.launch({
                executablePath: '/usr/bin/chromium-browser',
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            this.browser = await puppeteer.launch({
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox']
            });
        }
        this.page = await this.browser.newPage();
    }

    async goToNextPage() {
        try {
            const form = await this.page.$x("//a[contains(text(), '>')]");
            if (form.length > 0) {
                await form[0].click();
                await this.page.waitFor(this.timeWaitClick);
                return true;
            } else {
                return false;
            }

        } catch (err) {
            console.log(err);
        }
    }


    async extractPageData() {
        try {
            let data = [];
            const divs = await this.page.$$('div.sui-CardComposable-secondary');
            for (const div of divs) {

                /*
                let divCopy = Object.create(div);
                const spanMeters = await divCopy.$$('span.re-Card-wrapperFeatures')
                let meters = await (await spanMeters[1].getProperty('textContent')).jsonValue();
                meters = meters.replace("m²", "").trim();
 
                const spanPrize = await div.$('span.re-Card-price>span')
                let prize = await (await spanPrize.getProperty('textContent')).jsonValue();
                prize = prize.replace("€", "").trim();
                */
                try {
                    const content = await this.page.evaluate(el => el.innerHTML, div);

                    const auxPrize = content.split("€")[0]
                    const prize = auxPrize.split("<span>")[auxPrize.split("<span>").length - 1].trim().replace(".", "");

                    const auxMeters = content.split("m²")[0]
                    const meters = auxMeters.split('<span class="re-Card-feature">')[auxMeters.split('<span class="re-Card-feature">').length - 1].trim();

                    if (meters.indexOf("hab") > -1 || prize.indexOf(">") > -1) {
                        throw Error;
                    }
                    const newAdInfo = { prize, meters }
                    data.push(newAdInfo);
                } catch (err) {
                    console.log("error obtaining prize and meters");
                    //console.log(err);
                }

            }

            return data
        } catch (err) {
            console.log(err);
        }


    }

    calculateAverage(adData) {
        let sum = 0;
        let errorCount = 0;

        for (const data of adData) {
            if (data.prize && data.meters && (data.prize.indexOf("<") == -1) && (data.meters.indexOf("<") == -1)) {
                sum = sum + data.prize / data.meters;
            } else {
                errorCount = errorCount + 1;
            }
        }

        return sum / (adData.length - errorCount);
    }

    async saveHtml() {
        let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync("./data/htmPage.html", bodyHTML);
    }

    async anyResultsFound() {
        const noResultsClass = "div.re-SearchresultNoResults-text";
        try {
            const div = await this.page.$(noResultsClass);
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text == undefined;
        } catch (err) {
            return true
        }
    }



    async readNumberOfEntries() {
        try {
            const div = await this.page.$('div[style="margin-top: 8px;"]');
            const text = await (await div.getProperty('textContent')).jsonValue();
            await this.page.waitFor(this.timeWaitClick);
            return text.split(" ")[2].trim();
        } catch (err) {
            await this.saveHtml();
            console.log(err);
        }
    }
}