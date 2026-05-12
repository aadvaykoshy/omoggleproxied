'use strict';

const { spawn } = require('child_process');
const http = require('http');

const proxyPort = Number(process.env.TEST_PORT || 4150);

const startUpstream = () => new Promise((resolve) => {
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('proxy-ok');
  });

  upstream.listen(0, '127.0.0.1', () => resolve(upstream));
});

const requestOnce = () => new Promise((resolve, reject) => {
  const req = http.get({
    hostname: '127.0.0.1',
    port: proxyPort,
    path: '/',
    timeout: 5000
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200 && body.includes('proxy-ok')) {
        resolve();
      } else {
        reject(new Error(`Unexpected response: ${res.statusCode}`));
      }
    });
  });

  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy(new Error('Request timed out'));
  });
});

const waitForProxy = async () => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      await requestOnce();
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('Proxy did not respond before timeout.');
};

const run = async () => {
  const upstream = await startUpstream();
  const upstreamPort = upstream.address().port;

  const child = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(proxyPort),
      TARGET_URL: `http://127.0.0.1:${upstreamPort}`
    },
    stdio: 'inherit'
  });

  const shutdownChild = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };

  try {
    await waitForProxy();
  } finally {
    shutdownChild();
    upstream.close();
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
