// Local production assets, remote BBB APIs. No compiler or HMR in the measured run.
const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const YAML = require('yaml');

if (!process.env.BBB_SERVER) throw new Error('BBB_SERVER is required');
const remote = new URL(process.env.BBB_SERVER);
const transport = process.env.PERF_BACKEND_TUNNEL
  ? new URL(process.env.PERF_BACKEND_TUNNEL)
  : remote;
if (process.env.PERF_BACKEND_TUNNEL
  && (transport.protocol !== 'https:' || !['127.0.0.1', 'localhost'].includes(transport.hostname))) {
  throw new Error('PERF_BACKEND_TUNNEL must be a local HTTPS SSH forward');
}
const upstream = {
  target: transport.origin,
  changeOrigin: !process.env.PERF_BACKEND_TUNNEL,
  ...(process.env.PERF_BACKEND_TUNNEL ? {
    headers: { host: remote.host },
    agent: new https.Agent({ servername: remote.hostname }),
  } : {}),
};
const port = Number(process.env.PORT || 3000);
const origin = `http://localhost:${port}`;
const root = path.resolve(process.env.PERF_DIST || path.join(__dirname, '../dist'));
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Build production assets first');
const performanceMode = process.env.PERF_PERFORMANCE_MODE;
if (performanceMode && !['auto', 'low', 'standard'].includes(performanceMode)) {
  throw new Error('Invalid PERF_PERFORMANCE_MODE');
}
const applyPerformanceTestOverride = (performanceSettings) => {
  if (!performanceSettings
    || (process.env.PERF_ADAPTIVE_PROTECTION !== '1' && !performanceMode)) return performanceSettings;
  return {
    ...performanceSettings,
    adaptiveProtectionEnabled: true,
    ...(performanceMode ? { mode: performanceMode } : {}),
  };
};
const app = express();
app.get('/html5client/locales', (_req, res) => res.json(
  fs.readdirSync(path.join(root, 'locales')).map((name) => ({ name, type: 'file' })),
));
app.get('/html5client/private/config/settings.yml', (_req, res) => {
  const settingsPath = path.join(root, 'private/config/settings.yml');
  if (process.env.PERF_ADAPTIVE_PROTECTION !== '1' && !process.env.PERF_PERFORMANCE_MODE) {
    res.sendFile(settingsPath);
    return;
  }
  const settings = YAML.parse(fs.readFileSync(settingsPath, 'utf8'));
  settings.public.safemeetPerformance = applyPerformanceTestOverride(
    settings.public.safemeetPerformance,
  );
  res.type('text/yaml').send(YAML.stringify(settings));
});
app.use('/html5client', express.static(root));
const quietLogger = {
  log() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};
app.use(createProxyMiddleware('/bigbluebutton/api', {
  ...upstream,
  selfHandleResponse: true,
  logProvider: () => quietLogger,
  onProxyRes: responseInterceptor(async (buffer, proxyRes) => {
    if (!String(proxyRes.headers['content-type']).includes('json')) return buffer;
    return buffer.toString('utf8')
      .replaceAll(`${remote.origin}/api/rest`, `${origin}/api/rest`)
      .replaceAll(`wss://${remote.host}/graphql`, `ws://localhost:${port}/graphql`);
  }),
}));
const proxy = createProxyMiddleware(
  ['/bigbluebutton', '/api', '/graphql', '/bbb-webrtc-sfu', '/livekit', '/hocuspocus', '/pad'],
  {
    ...upstream,
    ws: true,
    selfHandleResponse: true,
    logProvider: () => quietLogger,
    onProxyRes: responseInterceptor(async (buffer, proxyRes) => {
      if (!String(proxyRes.headers['content-type']).includes('json')) return buffer;
      if (process.env.PERF_ADAPTIVE_PROTECTION !== '1' && !performanceMode) return buffer;
      try {
        const body = JSON.parse(buffer.toString('utf8'));
        const clientSettings = (body?.data?.meeting?.[0] || body?.meeting?.[0])
          ?.clientSettings?.clientSettingsJson;
        if (clientSettings?.public?.safemeetPerformance) {
          clientSettings.public.safemeetPerformance = applyPerformanceTestOverride(
            clientSettings.public.safemeetPerformance,
          );
        }
        return JSON.stringify(body);
      } catch {
        return buffer;
      }
    }),
    onProxyReqWs: (req) => req.setHeader('origin', remote.origin),
    onError: (_error, _req, res) => {
      if (res.writeHead) res.writeHead(502).end('Remote backend unavailable');
    },
  },
);
app.use(proxy);
app.listen(port, '127.0.0.1', () => console.log(`Production client: ${origin}/html5client/`));
