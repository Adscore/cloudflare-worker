# Adscore Cloudflare Worker Integration

Cloudflare Worker implementation for [Adscore](https://www.adscore.com) bot and proxy traffic detection, based on [Adscore/nodejs-common](https://github.com/Adscore/nodejs-common).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Adscore/cloudflare-worker)

## Configuration

You can configure the worker using **Cloudflare Worker environment variables** (in the Cloudflare dashboard or `wrangler.toml`) or by updating `variables.js` in the root folder before building:

```javascript
export const variables = {
  ADSCORE_ZONE_REQUEST_KEY: "<paste_request_key_here_or_leave_empty>",
  ALLOWED_VERDICTS: ["ok", "junk", "proxy"],
  ADSCORE_ZONE_API_KEY: "<paste_api_key_here_or_leave_empty>",
  ADSCORE_ZONE_RESPONSE_KEY: "<paste_response_key_here_or_leave_empty>",
};
```

- `ADSCORE_ZONE_API_KEY`: Your Adscore Zone API key.
- `ADSCORE_ZONE_RESPONSE_KEY`: Your Adscore Zone response key (for signature verification).
- `ALLOWED_VERDICTS`: List of verdicts allowed to pass through to your origin (e.g. `["ok", "junk", "proxy", "bot"]`, or `"ok,junk,proxy"` when passed as a string environment variable).
- `ADSCORE_ZONE_REQUEST_KEY`: Optional request signing key.
- `DEBUG`: Optional boolean (`true` / `"true"`) to enable verification debug logging.

## Building & Deploying

Requires Node.js >= 18.19.0.

1. Install dependencies:

   ```bash
   npm i
   ```

2. Build the worker with your configured `variables.js`:

   ```bash
   npm run dev
   ```

   This generates `dist/worker.js` and `dist/libsodium.wasm`.

3. Deploy to Cloudflare using Wrangler:

   ```bash
   npm run deploy
   ```

## Supported Signature Algorithms

- `v5_0101M` – Sodium Secretbox, Msgpack

## Deprecated (legacy support)

- `v5_0200H` – OpenSSL CBC, HTTP query (RFC 3986)
- `v5_0201H` – OpenSSL GCM, HTTP query (RFC 3986)
- `v5_0200J` – OpenSSL CBC, JSON
- `v5_0201J` – OpenSSL GCM, JSON
- **Signature v4** – Hashing (HMAC) and Signing (ECDSA)

## License

MIT License. See [LICENSE](LICENSE) for details.
