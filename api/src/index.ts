import http from 'http';
import { loadData, getClassData, getItemIds, getRaidsData, getRecipesData, getDataStats } from './services/data.js';
import { jsonResponse, errorResponse } from './utils/response.js';

const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

loadData();

const userSessions = new Map();
const userProgress = new Map();

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || FRONTEND_URL;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api') {
    return errorResponse(res, 'Not found');
  }

  const route = parts.slice(1);

  if (route[0] === 'health') {
    return jsonResponse(res, { status: 'ok', ...getDataStats() });
  }

  if (route[0] === 'classes') {
    return jsonResponse(res, getClassData());
  }

  if (route[0] === 'items') {
    return jsonResponse(res, getItemIds());
  }

  if (route[0] === 'raids') {
    return jsonResponse(res, getRaidsData());
  }

  if (route[0] === 'recipes') {
    return jsonResponse(res, getRecipesData());
  }

  if (route[0] === 'auth' && route[1] === 'login') {
    res.writeHead(302, { 'Location': `${FRONTEND_URL}?auth_token=demo_token&battletag=DemoUser%231234` });
    return res.end();
  }

  if (route[0] === 'progress') {
    if (req.method === 'GET') {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      const progress = userProgress.get(token) || { attunements: {}, bis: {} };
      return jsonResponse(res, progress);
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const authHeader = req.headers.authorization;
          const token = authHeader?.replace('Bearer ', '');
          if (token) {
            userProgress.set(token, data);
          }
          jsonResponse(res, { success: true });
        } catch (e) {
          errorResponse(res, 'Invalid JSON', 400);
        }
      });
      return;
    }
  }

  if (route[0] === 'donate' && route[1] === 'create-session') {
    return jsonResponse(res, {
      url: `${FRONTEND_URL}?donate=success`,
      sessionId: 'demo_session'
    });
  }

  return errorResponse(res, 'Not found');
});

server.listen(PORT, () => {
  console.log(`TBC API running on http://localhost:${PORT}`);
});
