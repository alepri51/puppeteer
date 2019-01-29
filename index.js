const puppeteer = require('puppeteer');
const axios = require('axios');

(async () => {
    //долгота = lat
    //широта = lоt
    
    let [lat, lon] = [37.094162, 55.945471]; //building_id
    let building_id = [lat, lon];

    //let response = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${lat},${lon}&kind=metro&results=3&format=json`);
    let { data: { response: { GeoObjectCollection: { featureMember: metro = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${lat},${lon}&kind=metro&results=3&format=json`);

    metro = metro.map(({ GeoObject: geo }) => {
        let [lat, lon] = geo.Point.pos.split(/\s/);

        return {
            name: geo.name,
            description: geo.description,
            coordinates: [+lat, +lon]
        }
    });

    //console.log(metro);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(`file:///${__dirname}/map.html`);
    //await page.goto('https://example.com');
    
    //await afterUrlOpen(page);
    //await page.pdf({path: 'hn.pdf', format: 'A4'});

    let res = await page.evaluate(async (metro, building_id) => {
        
        let routes = await GetMetroRoutes({ from: building_id, metro, types: ['auto', 'pedestrian', 'masstransit'] });
        
        return routes;

    }, metro, building_id);

    //await page.screenshot({path: 'example.png'});

    console.log(res);

    await browser.close();
})();