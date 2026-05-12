# Omoggle Proxy

This repository hosts a small Node.js proxy for https://omoggle.com. It forwards all HTTP(S) traffic and WebSocket upgrades through a single endpoint so the site loads normally.

## Requirements

- Node.js 22.15+ (22.x) or 24+

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Local port to listen on | `3000` |
| `TARGET_URL` | Upstream site to proxy | `https://omoggle.com` |
| `PROXY_LOG_LEVEL` | Proxy logging level | `info` |

## GitHub Actions

The workflow `.github/workflows/proxy-smoke.yml` runs a smoke test that starts the proxy and verifies it can reach the upstream site. Trigger it manually from the Actions tab if you want to run the proxy checks in GitHub Actions.
