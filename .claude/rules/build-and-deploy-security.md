# Build & Deploy Security

Rules for what ships to the public internet from this repo. **Non-negotiable** — violations have caused real incidents in comparable projects (see background).

## Hard rules

### 1. No sourcemaps in production
`.js.map` / `.css.map` files expose the original TypeScript source, inline comments, internal file paths, and module structure. They make reverse-engineering trivial and surface internal admin/auth logic to attackers.

**Three layers of defense** — all must stay in place:

| Layer | Enforcement | Location |
|---|---|---|
| Vite config | `build.sourcemap: false` (+ `rollupOptions.output.sourcemap: false`) | `vite.config.ts:48-54` |
| Build script | `find dist -name '*.map' -delete` as last step of `npm run build` | `package.json` `scripts.build` |
| Deploy script | `find dist -name '*.map' -delete` before sync, `--exclude "*.map"` on every `aws s3 sync` | `scripts/deploy-frontend.sh` |

**If you add a new `aws s3 sync` or `aws s3 cp` command anywhere**, it MUST include `--exclude "*.map"`. No exceptions.

**If you change the build pipeline** (swap Vite for another bundler, add a new plugin, upgrade major versions), re-verify after the change: `npm run build && find dist -name '*.map' | wc -l` must return `0`.

### 2. No backend secrets in the frontend bundle
Anything prefixed `VITE_*` gets inlined into the JavaScript that ships to browsers. Only public values allowed:
- ✅ `VITE_API_URL`, `VITE_DYNAMIC_API_URL` (public API Gateway URLs)
- ✅ `VITE_APP_TITLE`, feature flags
- ❌ `VITE_ANTHROPIC_API_KEY`, `VITE_JWT_SECRET`, `VITE_DATABASE_URL`, `VITE_ADMIN_PASSWORD` — never

Backend secrets load only via `process.env.*` in `server/src/**` (which runs in Lambda, not the browser). When in doubt, `grep -rn 'import\.meta\.env\|process\.env' src/` should show only public values.

### 3. Env files stay gitignored
`.gitignore` already covers `.env`, `.env.local`, `.ai-timeline-admin-token`. Never remove those lines. Never add a new env file with secrets to tracking, even "temporarily". `.env.example` is fine (template with blank values). `.env.production` is tracked but must contain ONLY public URLs — check before committing.

### 4. Admin tokens never land in files
Do not write admin JWTs to disk in a path that might get committed. If a CLI workflow needs a token, read it from `process.env` or prompt for it. Treat the JWT signing secret like any other production credential: rotate on a schedule and after any suspected exposure.

### 5. Deploy via the script, not ad-hoc commands
Use `scripts/deploy-frontend.sh` — it has all guards baked in. Avoid copy-pasting `aws s3 sync dist/ ...` from anywhere (docs, old shell history, AI suggestions) without the `--exclude "*.map"` flag. The one-liner in `CLAUDE.md` and the script stay in sync; if they drift, fix the docs.

## Background — why these rules exist

**Claude Code npm leak (2026-03-31):** Anthropic shipped a 59.8 MB `.js.map` sourcemap inside the `@anthropic-ai/claude-code` v2.1.88 npm package. Within hours, ~513,000 lines of proprietary TypeScript across ~1,906 files were public. Framed as "packaging error, not a security breach." ([Hacker News coverage](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html))

**This project:** a routine security audit surfaced the same class of issue — the frontend build pipeline was emitting sourcemaps that reached the CDN. No application secrets were exposed (the `VITE_*` bundle was clean), but internal source organization and client-side call patterns were recoverable. Remediated the same day; these rules are the post-mortem.

## Verification checklist (run before any frontend deploy)

```bash
# 1. No sourcemaps built
rm -rf dist/ && npm run build
find dist -name '*.map' | wc -l   # must be 0

# 2. No backend secrets in bundle
grep -rn 'VITE_' src/ | grep -iE 'secret|password|token|api.?key' | grep -v '// ' | grep -v API_URL
# should print nothing

# 3. Env files still ignored
git ls-files | grep -E '^\.env($|\.)' | grep -v '\.env\.example\|\.env\.production'
# should print nothing

# 4. After deploy, probe production
curl -sI https://letaiexplainai.com/assets/index.js.map | head -1
# should be HTTP/2 404 (or redirect to HTML fallback), NOT 200 with binary/octet-stream
```

If any check fails: stop, diagnose, fix — do not ship.
