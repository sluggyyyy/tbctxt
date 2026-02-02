// TBC API Server - v1.1.0 (item search support)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Blizzard OAuth token cache
let bnetAccessToken = '';
let bnetTokenExpiry = 0;

let classData = {};
let itemIds = {};
let raidsData = {};
let recipesData = {};
let referenceData = {};

function loadData() {
    classData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'classData.json')));
    itemIds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'itemIds.json')));
    raidsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'raidsData.json')));
    recipesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recipesData.json')));
    referenceData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'referenceData.json')));
    console.log(`Loaded: ${Object.keys(classData).length} classes, ${Object.keys(itemIds).length} items`);
}

function jsonResponse(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

function errorResponse(res, message, status = 404) {
    jsonResponse(res, { error: message }, status);
}

// Blizzard OAuth2 token fetching
function getBnetAccessToken(region) {
    return new Promise((resolve, reject) => {
        if (bnetAccessToken && bnetTokenExpiry > Date.now() / 1000 + 60) {
            return resolve(bnetAccessToken);
        }

        const clientId = process.env.BNET_CLIENT_ID;
        const clientSecret = process.env.BNET_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return reject(new Error('BNET_CLIENT_ID and BNET_CLIENT_SECRET required'));
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const postData = 'grant_type=client_credentials';

        const req = https.request({
            hostname: `${region}.battle.net`,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.access_token) {
                        bnetAccessToken = parsed.access_token;
                        bnetTokenExpiry = Date.now() / 1000 + parsed.expires_in;
                        resolve(bnetAccessToken);
                    } else {
                        reject(new Error('No access token in response: ' + JSON.stringify(parsed)));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Blizzard API request
function bnetApiRequest(region, path, namespace, token) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: `${region}.api.blizzard.com`,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Battlenet-Namespace': namespace
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Handle Blizzard character gear lookup
async function handleBnetCharacter(req, res, url) {
    const name = url.searchParams.get('name');
    const realm = url.searchParams.get('realm');
    const region = url.searchParams.get('region') || 'us';

    if (!name || !realm) {
        return errorResponse(res, 'name and realm parameters required', 400);
    }

    let token;
    try {
        token = await getBnetAccessToken(region);
    } catch (e) {
        console.error('Blizzard auth error:', e.message);
        return errorResponse(res, 'Blizzard authentication failed: ' + e.message, 503);
    }

    const namespaces = [
        `profile-classic-${region}`,
        `profile-classic1x-${region}`,
        `profile-classicprogression-${region}`
    ];

    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-');
    const charName = name.toLowerCase();
    const path = `/profile/wow/character/${realmSlug}/${charName}/equipment`;

    console.log(`Fetching: ${path}`);

    let lastError = null;
    for (const namespace of namespaces) {
        console.log(`Trying namespace: ${namespace}`);
        try {
            const result = await bnetApiRequest(region, path, namespace, token);
            console.log(`Response (${namespace}):`, result.status, JSON.stringify(result.data).substring(0, 200));

            if (result.status === 200 && result.data.equipped_items) {
                const gear = result.data.equipped_items.map(item => ({
                    id: item.item?.id,
                    name: typeof item.name === 'object' ? (item.name.en_US || item.name.en_GB || Object.values(item.name)[0]) : item.name,
                    slot: item.slot?.type,
                    quality: item.quality?.type,
                    itemLevel: item.level?.value
                }));

                return jsonResponse(res, {
                    name: charName,
                    gear,
                    realm,
                    region,
                    source: 'blizzard',
                    namespace
                });
            }
            lastError = result.data;
        } catch (e) {
            console.error(`Error with namespace ${namespace}:`, e.message);
            lastError = e.message;
        }
    }

    return errorResponse(res, 'Character not found. Tried namespaces: ' + namespaces.join(', '), 404);
}

// Handle Blizzard item search by name
async function handleItemSearch(req, res, url) {
    const name = url.searchParams.get('name');
    const region = url.searchParams.get('region') || 'us';

    if (!name) {
        return errorResponse(res, 'name parameter required', 400);
    }

    let token;
    try {
        token = await getBnetAccessToken(region);
    } catch (e) {
        console.error('Blizzard auth error:', e.message);
        return errorResponse(res, 'Blizzard authentication failed: ' + e.message, 503);
    }

    const namespaces = [
        `static-classic-${region}`,
        `static-classic1x-${region}`
    ];

    const searchName = encodeURIComponent(name);

    for (const namespace of namespaces) {
        try {
            const searchPath = `/data/wow/search/item?name.en_US=${searchName}&orderby=id&_pageSize=10`;
            console.log(`Item search: ${searchPath} (${namespace})`);

            const result = await bnetApiRequest(region, searchPath, namespace, token);

            if (result.status === 200 && result.data.results && result.data.results.length > 0) {
                const items = result.data.results.map(r => ({
                    id: r.data.id,
                    name: typeof r.data.name === 'object'
                        ? (r.data.name.en_US || r.data.name.en_GB || Object.values(r.data.name)[0])
                        : r.data.name,
                    quality: r.data.quality?.type,
                    itemLevel: r.data.level
                }));

                return jsonResponse(res, {
                    query: name,
                    count: items.length,
                    items,
                    namespace
                });
            }
        } catch (e) {
            console.error(`Item search error (${namespace}):`, e.message);
        }
    }

    return jsonResponse(res, { query: name, count: 0, items: [] });
}

const server = http.createServer((req, res) => {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'api') return errorResponse(res, 'Not found');

    const route = parts.slice(1);

    // /api/health
    if (route[0] === 'health') {
        return jsonResponse(res, { status: 'ok', classes: Object.keys(classData).length, items: Object.keys(itemIds).length });
    }

    // /api/classes, /api/classes/:class, /api/classes/:class/:spec
    if (route[0] === 'classes') {
        if (!route[1]) {
            const list = {};
            for (const [name, data] of Object.entries(classData)) {
                list[name] = { title: data.title, defaultSpec: data.defaultSpec, specs: Object.keys(data.specs || {}) };
            }
            return jsonResponse(res, list);
        }
        const cls = classData[route[1].toLowerCase()];
        if (!cls) return errorResponse(res, `Class '${route[1]}' not found`);
        if (!route[2]) return jsonResponse(res, cls);
        const spec = cls.specs?.[route[2].toLowerCase()];
        if (!spec) return errorResponse(res, `Spec '${route[2]}' not found`);
        return jsonResponse(res, spec);
    }

    // /api/items, /api/items/search?q=, /api/items/:name
    if (route[0] === 'items') {
        if (!route[1]) return jsonResponse(res, { total: Object.keys(itemIds).length, message: 'Use /api/items/search?q=name' });
        if (route[1] === 'search') {
            const q = (url.searchParams.get('q') || '').toLowerCase();
            if (!q) return errorResponse(res, 'Query parameter q required', 400);
            const results = {};
            let count = 0;
            for (const [name, id] of Object.entries(itemIds)) {
                if (name.toLowerCase().includes(q) && count < 50) { results[name] = id; count++; }
            }
            return jsonResponse(res, { query: q, count, items: results });
        }
        const name = route[1].toLowerCase();
        if (itemIds[name]) return jsonResponse(res, { name, itemId: itemIds[name], wowhead: `https://tbc.wowhead.com/item=${itemIds[name]}` });
        for (const [n, id] of Object.entries(itemIds)) {
            if (n.toLowerCase().includes(name)) return jsonResponse(res, { name: n, itemId: id, wowhead: `https://tbc.wowhead.com/item=${id}`, partialMatch: true });
        }
        return errorResponse(res, `Item '${route[1]}' not found`);
    }

    // /api/raids, /api/raids/:phase, /api/raids/:phase/:raid
    if (route[0] === 'raids') {
        if (!route[1]) return jsonResponse(res, raidsData);
        let phase = route[1].toLowerCase();
        if (!phase.startsWith('phase')) phase = 'phase' + phase;
        if (!raidsData[phase]) return errorResponse(res, `Phase '${route[1]}' not found`);
        if (!route[2]) return jsonResponse(res, raidsData[phase]);
        const raid = raidsData[phase].raids?.[route[2].toLowerCase()];
        if (!raid) return errorResponse(res, `Raid '${route[2]}' not found`);
        return jsonResponse(res, raid);
    }

    // /api/recipes, /api/recipes/:profession
    if (route[0] === 'recipes') {
        if (!route[1]) {
            const list = {};
            for (const [name, data] of Object.entries(recipesData)) {
                list[name] = { title: data.title, categories: Object.keys(data.categories || {}) };
            }
            return jsonResponse(res, list);
        }
        const prof = recipesData[route[1].toLowerCase()];
        if (!prof) return errorResponse(res, `Profession '${route[1]}' not found`);
        return jsonResponse(res, prof);
    }

    // /api/reference, /api/reference/enchants, /api/reference/talents, /api/reference/quests
    if (route[0] === 'reference') {
        if (!route[1]) return jsonResponse(res, referenceData);
        if (route[1] === 'enchants') return jsonResponse(res, referenceData.enchantSpellIds || {});
        if (route[1] === 'talents') return jsonResponse(res, referenceData.talentSpellIds || {});
        if (route[1] === 'quests') return jsonResponse(res, referenceData.questIds || {});
        return errorResponse(res, 'Not found');
    }

    // /api/character?name=&realm=&region= (Blizzard API)
    if (route[0] === 'character') {
        return handleBnetCharacter(req, res, url);
    }

    // /api/item-search?name= (Blizzard item search by name)
    if (route[0] === 'item-search') {
        return handleItemSearch(req, res, url);
    }

    return errorResponse(res, 'Not found');
});

loadData();
server.listen(PORT, () => console.log(`TBC API running on http://localhost:${PORT}`));
