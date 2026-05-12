'use strict';

const express = require('express');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET_URL = process.env.TARGET_URL || 'https://omoggle.com';
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.disable('x-powered-by');

const proxy = createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  ws: true,
  secure: true,
  xfwd: true,
  autoRewrite: true,
  cookieDomainRewrite: '',
  logLevel: process.env.PROXY_LOG_LEVEL || 'info',
  onProxyReq: (proxyReq, req) => {
    if (req.headers.origin) {
      proxyReq.setHeader('origin', TARGET_URL);
    }
  },
  onProxyReqWs: (proxyReq, req) => {
    if (req.headers.origin) {
      proxyReq.setHeader('origin', TARGET_URL);
    }
  },
  onError: (err, req, res) => {
    if (res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error.');
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
