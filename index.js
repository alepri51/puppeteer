const puppeteer = require('puppeteer');
const axios = require('axios');

const query = async ({ driver, query, params, options }) => {
    //console.log(query);
    const session = driver.session();
    //debugger
    return new Promise((resolve, reject) => {
        session
            .run(query, params)
            .then(result => {
                let cache = {};
                result.records = result.records.map(record => {
                    let nodes = {};

                    for(let key of record.keys) {
                        let value = record.get(key);
                        //let identity = value && (neo4j.integer.inSafeRange(value.identity) ? value.identity.toNumber() : value.identity.toString());
                        //let identity = value && (neo4j.integer.inSafeRange(value.identity) ? value.identity.toNumber() : value.identity.toString());
                        
                        //value = value ? neo4jIntsToStrings(value.properties || value) : void 0;
                        if(typeof(value) === 'object' && value !== null) {
                            let identity = value.identity;
                            value = value.properties || value;
                            
                            value.$ID = identity;
                            nodes[key] = value;
                            /* if(!cache[identity] || (cache[identity] && !nodes[key])) {
                                cache[identity] = true;

                                //nodes[key] = nodes[key] || {};
                                //nodes[key][identity] = value;
                                if(nodes[key]) {
                                    nodes[key] = Array.isArray(nodes[key]) ? nodes[key] : [nodes[key]];
                                    nodes[key].push(value);
                                }
                                else nodes[key] = value
                            } */
                            /* if(nodes[key]) {
                                nodes[key] = Array.isArray(nodes[key]) ? nodes[key] : [nodes[key]];
                                nodes[key].push(value);
                            }
                            else nodes[key] = value */
                        }
                        else nodes[key] = value;
                    }

                    return nodes;
                });
                
                resolve(result.records);
                session.close();
            })
            .catch(error => {
                console.log(query, error);
                reject(error);
            });
            
            /* .subscribe({
                onNext: function (record) {
                    console.log(record.get('n'));
                    //resolve(record);
                },
                onCompleted: function (records) {
                    session.close();
                    resolve(record);
                },
                onError: function (error) {
                    console.log(error);
                    reject(error);
                }
            }); */
    })

    // or
    // the Promise way, where the complete result is collected before we act on it:
    /* session
        .run('MERGE (james:Person {name : {nameParam} }) RETURN james.name AS name', {nameParam: 'James'})
        .then(function (result) {
            result.records.forEach(function (record) {
                console.log(record.get('name'));
            });
            session.close();
        })
        .catch(function (error) {
            console.log(error);
        }); */
}

(async () => {

    const neo4j = require('neo4j-driver').v1;
    const driver = neo4j.driver(`bolt://localhost:32768`, neo4j.auth.basic("neo4j", "123"), {disableLosslessIntegers: true}); //WARNING: POSSIBLE NUMBER DATA LOSS!!!

    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Мурманск, связи, 3')}&format=json`);
    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Кадоган-лэйн Лондон')}&format=json`);
    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('москва, новочеркасский, 30')}&format=json`);
    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Воронежская область,лискинский район, село Владимировка, ул Солнечная, 10')}&format=json`);
    let fred = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Воронежская область,лискинский район, село Владимировка, ул Солнечная, 10')}&format=json`);
    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Шабур остров')}&format=json`);
    //let { data: { response: { GeoObjectCollection: { featureMember: found = [] }}}} = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('новая москва')}&format=json`);

    
    for(let object of found) {
        let { GeoObject: geo } = object;
        let { metaDataProperty: { GeocoderMetaData: { Address: { Components: components }}}} = geo;

        let [lat, lon] = geo.Point.pos.split(/\s/);
        
        components.push({
            kind: 'coordinates',
            name: `${lat}, ${lon}`,
            lat,
            lon
        });

        let { nodes, relations, params } = components.reduce((memo, component, level) => {

            memo.paths.push(component.name);

            let cql = `MERGE (n${level}:Geo:${component.kind} {path: '${memo.paths.join(',')}'}) SET n${level} += $n${level}`;

            memo.nodes.push(cql);
            memo.params[`n${level}`] = component;

            /* if(level === 0) {
                cql = `(n${level})`
            }
            else {
                cql = `[:in]-(n${level})`
            } */

            if(level > 0) {
                cql = `MERGE (n${level - 1})<-[:in]-(n${level})`;

                memo.relations.push(cql);
            }

            return memo;
        }, { nodes: [], relations: [], params: {}, paths: []});

        nodes = nodes.join('\n');
        relations = relations.join('\n');
        let cql = `${nodes}\n${relations}`;

        let neo_result = await query({ driver, query: cql, params });
    }


    //долгота = lat
    //широта = lоt
    
    let [lat, lon] = [37.610959, 55.723789]; //building_id
    let building_id = [lat, lon];

    //let response = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${lat},${lon}&kind=metro&results=3&format=json`);
    //let response = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=3eb0b0b4-b25d-42a9-92ad-9c04dbd2e172&geocode=${encodeURIComponent('Воронежская область,лискинский район, село Владимировка, ул Солнечная, 10')}&format=json`);
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