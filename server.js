'use strict';

const express = require('express');
const http = require('http');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

const TARGET_URL = process.env.TARGET_URL || 'https://omoggle.com';
const TARGET_HOST = new URL(TARGET_URL).host;
const PORT = Number(process.env.PORT || 3000);

// Pre-compiled regexes for rewriting target host references in response bodies.
// Dots in the hostname are escaped so they match literally, not as regex wildcards.
const escapedHost = TARGET_HOST.replace(/\./g, '\\.');
const RE_HTTPS = new RegExp(`https://${escapedHost}`, 'g');
const RE_HTTP  = new RegExp(`http://${escapedHost}`, 'g');
const RE_WSS   = new RegExp(`wss://${escapedHost}`, 'g');
const RE_WS    = new RegExp(`ws://${escapedHost}`, 'g');

const app = express();
app.disable('x-powered-by');

const proxy = createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  ws: true,
  secure: true,
  xfwd: true,
  autoRewrite: true,
  selfHandleResponse: true,
  cookieDomainRewrite: '',
  logger: console,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.headers.origin) {
        proxyReq.setHeader('origin', TARGET_URL);
      }
    },
    proxyReqWs: (proxyReq, req) => {
      if (req.headers.origin) {
        proxyReq.setHeader('origin', TARGET_URL);
      }
    },
    proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html') || contentType.includes('javascript')) {
        const proxyHost = req.headers.host || '';
        const proto = req.socket.encrypted ? 'https'
          : ((req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http');
        const wsProto = proto === 'https' ? 'wss' : 'ws';
        let body = responseBuffer.toString('utf8');
        body = body.replace(RE_HTTPS, `${proto}://${proxyHost}`);
        body = body.replace(RE_HTTP,  `${proto}://${proxyHost}`);
        body = body.replace(RE_WSS,   `${wsProto}://${proxyHost}`);
        body = body.replace(RE_WS,    `${wsProto}://${proxyHost}`);
        return body;
      }
      return responseBuffer;
    }),
    error: (err, req, res) => {
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error.');
      }
    }
  }
});

app.use('/', proxy);

const server = http.createServer(app);
server.on('upgrade', proxy.upgrade);

server.listen(PORT, () => {
  console.log(`Proxying ${TARGET_URL} on http://localhost:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
