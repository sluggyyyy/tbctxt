const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// WCL OAuth token cache
let wclAccessToken = '';
let wclTokenExpiry = 0;

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

// WCL OAuth2 token fetching
function getWclAccessToken() {
    return new Promise((resolve, reject) => {
        if (wclAccessToken && wclTokenExpiry > Date.now() / 1000 + 60) {
            return resolve(wclAccessToken);
        }

        const clientId = process.env.WCL_CLIENT_ID;
        const clientSecret = process.env.WCL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return reject(new Error('WCL_CLIENT_ID and WCL_CLIENT_SECRET required'));
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const postData = 'grant_type=client_credentials';

        const req = https.request({
            hostname: 'fresh.warcraftlogs.com',
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
                        wclAccessToken = parsed.access_token;
                        wclTokenExpiry = Date.now() / 1000 + parsed.expires_in;
                        resolve(wclAccessToken);
                    } else {
                        reject(new Error('No access token in response'));
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

// WCL GraphQL request
function wclGraphQL(query, token) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ query });

        const req = https.request({
            hostname: 'fresh.warcraftlogs.com',
            path: '/api/v2/client',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
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

// Handle WCL character gear lookup
async function handleWclCharacter(req, res, url) {
    const name = url.searchParams.get('name');
    const realm = url.searchParams.get('realm');
    const region = url.searchParams.get('region') || 'us';

    if (!name || !realm) {
        return errorResponse(res, 'name and realm parameters required', 400);
    }

    let token;
    try {
        token = await getWclAccessToken();
    } catch (e) {
        console.error('WCL auth error:', e.message);
        return errorResponse(res, 'Warcraft Logs authentication failed', 503);
    }

    // Query for character and recent reports
    // TBC Anniversary uses zoneID for the game version
    // Zone 1002 = TBC Classic
    const charQuery = `{
        characterData {
            character(name: "${name}", serverSlug: "${realm.toLowerCase()}", serverRegion: "${region}") {
                name
                classID
                zoneRankings(zoneID: 1002)
                recentReports(limit: 1, zoneID: 1002) {
                    data {
                        code
                        startTime
                        fights { id name }
                    }
                }
            }
        }
    }`;

    try {
        const charResp = await wclGraphQL(charQuery, token);
        console.log('WCL Response:', JSON.stringify(charResp, null, 2));

        if (charResp.errors?.length) {
            console.log('WCL Errors:', charResp.errors);
            return errorResponse(res, charResp.errors[0].message, 400);
        }

        const char = charResp.data?.characterData?.character;
        if (!char?.name) {
            console.log('Character not found in response:', charResp.data);
            return errorResponse(res, 'Character not found', 404);
        }

        let gear = [];

        // If we have a recent report, fetch gear from it
        if (char.recentReports?.data?.length > 0) {
            const report = char.recentReports.data[0];
            const fightId = report.fights?.[0]?.id || 1;

            const gearQuery = `{
                reportData {
                    report(code: "${report.code}") {
                        playerDetails(fightIDs: [${fightId}])
                    }
                }
            }`;

            const gearResp = await wclGraphQL(gearQuery, token);
            const playerDetails = gearResp.data?.reportData?.report?.playerDetails;

            // Search all roles for the player
            for (const role of ['dps', 'tanks', 'healers']) {
                const players = playerDetails?.[role] || [];
                for (const player of players) {
                    if (player.name?.toLowerCase() === name.toLowerCase()) {
                        gear = player.gear || [];
                        break;
                    }
                }
                if (gear.length) break;
            }
        }

        return jsonResponse(res, {
            name: char.name,
            classID: char.classID,
            gear,
            realm,
            region
        });

    } catch (e) {
        console.error('WCL API error:', e);
        return errorResponse(res, 'Failed to fetch from Warcraft Logs', 502);
    }
}

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
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

    // /api/wcl/character?name=&realm=&region=
    if (route[0] === 'wcl' && route[1] === 'character') {
        return handleWclCharacter(req, res, url);
    }

    return errorResponse(res, 'Not found');
});

loadData();
server.listen(PORT, () => console.log(`TBC API running on http://localhost:${PORT}`));
