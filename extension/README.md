# AI Timeline Submit — Chrome Extension

One-click article submission from any browser tab into the AI Timeline ingestion pipeline.

## What it does

When you click the extension while on an article:

1. **Server scrape** — calls `POST /api/admin/articles/scrape`. If the server can crawl the page, the article lands in the review queue at `screening` status. Done.
2. **Readability fallback** — if the server is blocked (paywall, anti-bot, JS-only), the extension extracts the rendered DOM in your already-authenticated browser session via Mozilla Readability, sanitizes the text with DOMPurify, and posts to `POST /api/admin/articles/submit`.

The two tiers run automatically; the popup shows which one won.

## Build

```bash
cd extension
bun install
bun run build       # → extension/dist/
```

## Sideload (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and pick `extension/dist/`
4. Pin the extension to the toolbar
5. Click the icon → sign in with your AI Timeline admin credentials (the `/ai-timeline/prod/admin-username` + `/ai-timeline/prod/admin-password` SSM values)

The extension ID is locked at `lfakkoeldmhibejkjolcmenpmlokbled` via the `key` field in `manifest.config.ts`. The admin API CORS allowlist contains exactly that origin.

## Setup on a second machine

The signing key (`extension/key.pem`) is **gitignored**. Copy it from your primary machine via secure transfer (1Password, USB, encrypted drop) — do **not** regenerate it. A new key produces a new extension ID, which would require updating the SSM CORS allowlist.

```bash
# Primary machine
cp extension/key.pem ~/Desktop/ai-timeline-extension-key.pem
# (transfer via 1Password / USB)

# Secondary machine
cp ~/Desktop/ai-timeline-extension-key.pem extension/key.pem
chmod 600 extension/key.pem
```

The same `EXTENSION_ID.txt` value (`lfakkoeldmhibejkjolcmenpmlokbled`) is recoverable from the public key via:

```bash
openssl rsa -in extension/key.pem -pubout -outform DER 2>/dev/null \
  | openssl dgst -sha256 -binary | head -c 16 \
  | xxd -p -c 32 | tr '0-9a-f' 'a-p'
```

## Force-Readability toggle

Some sites you already know will fail server-scrape (e.g. The Information). Tick **"Skip server scrape (use this tab's content)"** and the extension goes straight to the Readability path. The choice persists per-domain, so the next visit to that hostname starts in skip-server mode automatically.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Popup says "Sign in" repeatedly | JWT expired (24h lifetime) | Sign in again. |
| 403 from CORS | New extension ID (regenerated key) | Re-add origin to `/ai-timeline/prod/cors-origin` in SSM and refresh Lambda env. |
| "Could not extract article" | JS-only or video-only page | Use the manual paste form at `https://letaiexplainai.com/admin/submit-article`. |
| Toolbar button greyed out | Active tab is a `chrome://` or `about:` page | Switch to a real article tab. |
| Submit hangs >60s | Lambda cold start + slow scrape | Wait — the row will still appear in `/admin/review`. |

## Local dev

```bash
cd extension
bun run dev               # Vite watch mode
# in another terminal:
cd .. && npm run dev:server   # local API at localhost:3001
```

Vite injects `VITE_API_BASE=http://localhost:3001` from `.env.development`. Append `chrome-extension://lfakkoeldmhibejkjolcmenpmlokbled` to your local `server/.env` `CORS_ORIGIN` so the popup can reach the dev server.

## Tests

```bash
bun run test              # vitest
bun run typecheck
bun run lint
```

## Files of interest

- `manifest.config.ts` — MV3 manifest, CRX-style (key, permissions, host_permissions)
- `src/popup/lib/submit.ts` — two-tier submission state machine (pure logic)
- `src/content/content.ts` — Readability + DOMPurify content script
- `src/background/service-worker.ts` — toolbar badge state for in-flight submissions
- `src/lib/api.ts` — typed fetch wrapper with 401 → clear-storage handling
