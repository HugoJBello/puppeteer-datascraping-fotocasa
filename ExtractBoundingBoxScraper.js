const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');


module.exports = class FocotasaBoxScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.config = require("./data/config/scrapingConfig.json");

        this.timeWaitStart = 1 * 1000;
        this.timeWaitClick = 500;
        require('dotenv').load();

    }

    async extractBoundingBoxFromCityName(cityname) {

        const url = 'http://www.mapdevelopers.com/geocode_bounding_box.php';

        console.log("\n---");
        console.log(url);
        console.log("---");
        console.log(cityname);
        await this.initializePuppeteer();
        await this.page.goto(url);
        await this.page.waitFor(this.timeWaitStart);

        await this.page.focus('#addressInput')
        await this.page.keyboard.type(cityname)
        await this.page.keyboard.press(String.fromCharCode(13));

        await this.page.waitFor(1000);

        let text = await this.page.evaluate(() => {
            let elements = document.getElementById("status").innerText
            return elements;
        });

        console.log(text);

        const boundingBox2 = [text.split("West Longitude: ")[1].split(" ")[0], text.split("North Latitude: ")[1].split(" ")[0]]
        console.log(boundingBox2);

        const boundingBox1 = [text.split("East Longitude: ")[1].split(" ")[0], text.split("South Latitude: ")[1].split(" ")[0]]
        console.log(boundingBox1);


        this.browser.close();

        return [boundingBox2, boundingBox1];

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


}