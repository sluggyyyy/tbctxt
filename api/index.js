// TBC API Server - v1.3.0 (Battle.net user login + Stripe donations)
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Stripe setup
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

// Blizzard OAuth token cache (for client credentials)
let bnetAccessToken = '';
let bnetTokenExpiry = 0;

// User sessions (in-memory - consider Redis/DB for production)
const userSessions = new Map(); // sessionToken -> { bnetId, battletag, accessToken, expiry }
const userProgress = new Map(); // bnetId -> { attunements: {}, bis: {} }

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

// Generate secure session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Read raw request body (needed for Stripe webhook signature verification)
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// Supporters list (in-memory - consider DB for production)
const supporters = [];

// Create Stripe checkout session
async function handleCreateCheckoutSession(req, res) {
    if (!stripe) {
        return errorResponse(res, 'Stripe not configured', 503);
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);

            const priceId = process.env.STRIPE_PRICE_ID;
            if (!priceId) {
                return errorResponse(res, 'Stripe price not configured', 503);
            }

            const session = await stripe.checkout.sessions.create({
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'payment',
                submit_type: 'donate',
                success_url: `${FRONTEND_URL}?donate=success`,
                cancel_url: `${FRONTEND_URL}?donate=cancelled`,
            });

            return jsonResponse(res, { sessionId: session.id, url: session.url });
        } catch (e) {
            console.error('Stripe session error:', e.message);
            return errorResponse(res, 'Failed to create checkout session', 500);
        }
    });
}

// Handle Stripe webhook
async function handleStripeWebhook(req, res) {
    if (!stripe) {
        return errorResponse(res, 'Stripe not configured', 503);
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not set');
        return errorResponse(res, 'Webhook not configured', 503);
    }

    try {
        const rawBody = await getRawBody(req);
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const supporterName = session.metadata?.supporter_name || 'Anonymous';
            const amount = session.amount_total;

            console.log(`Donation received: ${supporterName} - $${(amount / 100).toFixed(2)}`);

            // Add to supporters list (avoid duplicates by name)
            if (!supporters.find(s => s.name === supporterName && supporterName !== 'Anonymous')) {
                supporters.push({
                    name: supporterName,
                    amount: amount,
                    date: new Date().toISOString()
                });
            }
        }

        return jsonResponse(res, { received: true });
    } catch (e) {
        console.error('Webhook error:', e.message);
        return errorResponse(res, 'Webhook error', 400);
    }
}

// Get supporters list
function handleGetSupporters(req, res) {
    // Return names only (not amounts) for privacy
    const publicList = supporters.map(s => ({ name: s.name }));
    return jsonResponse(res, { supporters: publicList });
}

// Parse cookies from request
function parseCookies(req) {
    const cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = decodeURIComponent(value || '');
        });
    }
    return cookies;
}

// Get user from session token (checks Authorization header first, then cookies)
function getUserFromSession(req) {
    // Check Authorization header first (for cross-origin)
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else {
        // Fall back to cookie
        const cookies = parseCookies(req);
        token = cookies.tbctxt_session;
    }
    if (!token) return null;
    const session = userSessions.get(token);
    if (!session || session.expiry < Date.now()) {
        userSessions.delete(token);
        return null;
    }
    return session;
}

// Handle OAuth login redirect
function handleAuthLogin(req, res) {
    const clientId = process.env.BNET_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${API_URL}/api/auth/callback`);
    const scope = encodeURIComponent('openid wow.profile');
    const state = generateSessionToken().substring(0, 16); // Anti-CSRF token

    const authUrl = `https://us.battle.net/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

    console.log('Redirecting to Battle.net OAuth:', authUrl);
    res.writeHead(302, { 'Location': authUrl });
    res.end();
}

// Handle OAuth callback
async function handleAuthCallback(req, res, url) {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
        console.error('OAuth error:', error);
        res.writeHead(302, { 'Location': `${FRONTEND_URL}#login-error` });
        return res.end();
    }

    if (!code) {
        res.writeHead(302, { 'Location': `${FRONTEND_URL}#login-error` });
        return res.end();
    }

    const clientId = process.env.BNET_CLIENT_ID;
    const clientSecret = process.env.BNET_CLIENT_SECRET;
    const redirectUri = `${API_URL}/api/auth/callback`;

    // Exchange code for access token
    const tokenData = await new Promise((resolve, reject) => {
        const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenReq = https.request({
            hostname: 'us.battle.net',
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        }, (tokenRes) => {
            let data = '';
            tokenRes.on('data', chunk => data += chunk);
            tokenRes.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        tokenReq.on('error', reject);
        tokenReq.write(postData);
        tokenReq.end();
    });

    if (!tokenData.access_token) {
        console.error('No access token:', tokenData);
        res.writeHead(302, { 'Location': `${FRONTEND_URL}#login-error` });
        return res.end();
    }

    // Get user info from Battle.net
    const userInfo = await new Promise((resolve, reject) => {
        const userReq = https.request({
            hostname: 'us.battle.net',
            path: '/oauth/userinfo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        }, (userRes) => {
            let data = '';
            userRes.on('data', chunk => data += chunk);
            userRes.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        userReq.on('error', reject);
        userReq.end();
    });

    console.log('User logged in:', userInfo.battletag, userInfo.sub);

    // Create session
    const sessionToken = generateSessionToken();
    const session = {
        bnetId: userInfo.sub,
        battletag: userInfo.battletag,
        accessToken: tokenData.access_token,
        expiry: Date.now() + (tokenData.expires_in * 1000)
    };
    userSessions.set(sessionToken, session);

    // Initialize user progress if not exists
    if (!userProgress.has(userInfo.sub)) {
        userProgress.set(userInfo.sub, { attunements: {}, bis: {} });
    }

    // Set cookie and redirect (secure in production)
    // Pass token and battletag in URL for cross-origin support
    const cookieExpiry = new Date(session.expiry).toUTCString();
    const isProduction = process.env.NODE_ENV === 'production' || !FRONTEND_URL.includes('localhost');
    const secureFlag = isProduction ? '; Secure' : '';
    const encodedBattletag = encodeURIComponent(userInfo.battletag);
    res.writeHead(302, {
        'Location': `${FRONTEND_URL}?auth_token=${sessionToken}&battletag=${encodedBattletag}#login-success`,
        'Set-Cookie': `tbctxt_session=${sessionToken}; Path=/; Expires=${cookieExpiry}; SameSite=Lax; HttpOnly${secureFlag}`
    });
    res.end();
}

// Handle get current user
function handleAuthUser(req, res) {
    const session = getUserFromSession(req);
    if (!session) {
        return jsonResponse(res, { loggedIn: false });
    }
    return jsonResponse(res, {
        loggedIn: true,
        battletag: session.battletag,
        bnetId: session.bnetId
    });
}

// Handle logout
function handleAuthLogout(req, res) {
    const cookies = parseCookies(req);
    const token = cookies.tbctxt_session;
    if (token) {
        userSessions.delete(token);
    }
    res.writeHead(302, {
        'Location': `${FRONTEND_URL}`,
        'Set-Cookie': 'tbctxt_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    });
    res.end();
}

// Handle get/save user progress
function handleProgress(req, res, method) {
    const session = getUserFromSession(req);
    if (!session) {
        return errorResponse(res, 'Not logged in', 401);
    }

    const progress = userProgress.get(session.bnetId) || { attunements: {}, bis: {} };

    if (method === 'GET') {
        return jsonResponse(res, progress);
    }

    // POST - save progress
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.attunements) progress.attunements = data.attunements;
            if (data.bis) progress.bis = data.bis;
            userProgress.set(session.bnetId, progress);
            console.log(`Progress saved for ${session.battletag}`);
            return jsonResponse(res, { success: true, progress });
        } catch (e) {
            return errorResponse(res, 'Invalid JSON', 400);
        }
    });
}

const server = http.createServer((req, res) => {
    // Set CORS headers for all responses (allow credentials for auth)
    const origin = req.headers.origin || FRONTEND_URL;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'api') return errorResponse(res, 'Not found');

    const route = parts.slice(1);

    // /api/auth/login - Redirect to Battle.net
    if (route[0] === 'auth' && route[1] === 'login') {
        return handleAuthLogin(req, res);
    }

    // /api/auth/callback - OAuth callback from Battle.net
    if (route[0] === 'auth' && route[1] === 'callback') {
        return handleAuthCallback(req, res, url);
    }

    // /api/auth/user - Get current user info
    if (route[0] === 'auth' && route[1] === 'user') {
        return handleAuthUser(req, res);
    }

    // /api/auth/logout - Logout
    if (route[0] === 'auth' && route[1] === 'logout') {
        return handleAuthLogout(req, res);
    }

    // /api/progress - Get/save user progress
    if (route[0] === 'progress') {
        return handleProgress(req, res, req.method);
    }

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

    // /api/donate/create-session - Create Stripe checkout session
    if (route[0] === 'donate' && route[1] === 'create-session' && req.method === 'POST') {
        return handleCreateCheckoutSession(req, res);
    }

    // /api/donate/webhook - Stripe webhook handler
    if (route[0] === 'donate' && route[1] === 'webhook' && req.method === 'POST') {
        return handleStripeWebhook(req, res);
    }

    // /api/donate/supporters - Get supporters list
    if (route[0] === 'donate' && route[1] === 'supporters') {
        return handleGetSupporters(req, res);
    }

    return errorResponse(res, 'Not found');
});

loadData();
server.listen(PORT, () => console.log(`TBC API running on http://localhost:${PORT}`));
