const puppeteer = require('puppeteer');

(async () => {
    let browser = await puppeteer.launch({
        //executablePath: '/usr/bin/chromium-browser'
        //userAgent: randomUA.generate(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    let page = await browser.newPage();
    const url = "https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_";

    for (let i = 1; i++; i <= 10000) {
        console.log("sending request");
        await page.goto(url);
        await page.screenshot({ path: 'example.png' });

    }
})()