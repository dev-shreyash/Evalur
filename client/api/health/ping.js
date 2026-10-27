/**
 * Vercel Serverless Function: /api/health/ping
 * 
 * Accessible at:
 * - https://evalur-self.vercel.app/health/ping (via vercel.json rewrite)
 * - https://evalur-self.vercel.app/api/health/ping
 * 
 * Designed for external cron jobs (e.g. cron-job.org, UptimeRobot, GitHub Actions)
 * to keep both the Vercel frontend and the Render backend warm.
 */

export default async function handler(req, res) {
  // CORS & Cache-Control headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  };

  // Support Vercel Serverless (Node), standard Node http.ServerResponse, and Vercel Edge Runtime
  const isEdge = !res || typeof res.setHeader !== 'function';
  const hasResJson = res && typeof res.json === 'function';
  const hasResStatus = res && typeof res.status === 'function';

  if (!isEdge) {
    for (const [key, val] of Object.entries(headers)) {
      res.setHeader(key, val);
    }
  }

  // Handle preflight OPTIONS / HEAD requests
  const method = req.method || (req.headers && req.headers.get ? req.method : 'GET');
  if (method === 'OPTIONS' || method === 'HEAD') {
    if (isEdge) {
      return new Response(null, { status: 200, headers });
    }
    if (hasResStatus) res.status(200);
    else res.statusCode = 200;
    return res.end();
  }

  // Identify backend base URL (Evalur Render production backend)
  const defaultBackend = 'https://evalur-backend.onrender.com';
  let backendBase = process.env.VITE_API_URL || process.env.BACKEND_URL || defaultBackend;
  backendBase = backendBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

  const start = Date.now();
  let backendInfo = {
    status: 'UNKNOWN',
    latencyMs: 0,
    url: backendBase,
  };

  // Ping backend to wake up Render free tier and inspect status
  try {
    const controller = new AbortController();
    // 8-second timeout: enough to initiate wakeup on Render without causing Vercel function timeout
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const backendRes = await fetch(`${backendBase}/api/v1/health/ping`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Evalur-Health-Ping/1.0',
      },
      signal: controller.signal,
    }).catch(async () => {
      // Fallback: ping root if /api/v1/health/ping is not yet deployed or is warming up
      return await fetch(`${backendBase}/health/ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }).catch(async () => {
        return await fetch(`${backendBase}/`, {
          method: 'GET',
          signal: controller.signal,
        });
      });
    });

    clearTimeout(timeoutId);
    backendInfo.latencyMs = Date.now() - start;
    backendInfo.status = backendRes && backendRes.ok ? 'UP' : (backendRes ? `HTTP_${backendRes.status}` : 'DOWN');
  } catch (err) {
    backendInfo.latencyMs = Date.now() - start;
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      backendInfo.status = 'WAKING_UP';
    } else {
      backendInfo.status = 'UNREACHABLE';
    }
  }

  const payload = {
    status: 'UP',
    message: 'pong',
    timestamp: new Date().toISOString(),
    service: 'evalur-api-ping',
    uptime: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0,
    backend: backendInfo,
  };

  if (isEdge) {
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers,
    });
  }

  if (hasResStatus) res.status(200);
  else res.statusCode = 200;

  if (hasResJson) {
    return res.json(payload);
  } else {
    return res.end(JSON.stringify(payload, null, 2));
  }
}

