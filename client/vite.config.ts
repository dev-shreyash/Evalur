import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const healthPingPlugin = (): Plugin => ({
  name: 'health-ping-dev-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/health/ping' || req.url === '/health/ping/' || req.url === '/api/health/ping') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'UP',
          message: 'pong',
          timestamp: new Date().toISOString(),
          service: 'evalur-local-dev',
        }, null, 2));
        return;
      }
      next();
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), healthPingPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
