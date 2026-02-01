const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

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

    return errorResponse(res, 'Not found');
});

loadData();
server.listen(PORT, () => console.log(`TBC API running on http://localhost:${PORT}`));
