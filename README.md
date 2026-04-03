# MagicLink

A Cloudflare Worker that gives recruiters demo access to AI-powered portfolio projects without exposing API keys. Each recruiter gets a token with 5 uses per project, valid for 30 days.

**Live at [magiclink.reneebe.workers.dev](https://magiclink.reneebe.workers.dev)**

## How It Works

1. Recruiter enters their email on the landing page
2. A 64-character token is generated and shown on screen with a copy button
3. Visiting any integrated project with `?token=...` in the URL activates demo mode
4. The SDK saves the token to `localStorage` and cleans the URL
5. AI calls route through MagicLink's proxy using server-side API keys
6. Each project tracks usage separately (5 per project)

## Architecture

```
Browser (SDK in localStorage)
  │
  ├─ Web apps ──→ /api/proxy ──→ Claude / Gemini APIs
  │
  ├─ Theme Generator ──→ /api/projects/theme-generator ──→ nano-claude-theme-manager worker
  │
  ├─ Persist (Chrome ext) ──→ /api/projects/persist ──→ KV demo storage
  │
  └─ Video Searcher ──→ /api/projects/ai-video-searcher/upload ──→ Gemini Files API
```

## Integrated Projects

| Day | Project | Provider | Integration |
|-----|---------|----------|-------------|
| 4 | Theme Generator | Claude + Gemini | SDK + project-specific endpoint |
| 5 | Theme Extension | Claude + Gemini | Chrome content script + project endpoint |
| 7 | Persist | N/A | Chrome content script + KV demo storage |
| 8 | Brain Dump Scheduler | Claude | SDK + generic proxy |
| 11 | AI Video Searcher | Gemini | SDK + video upload endpoint + generic proxy |
| 12 | Photo Location Quiz | Gemini | SDK + generic proxy |
| 13 | Idea Explorer | Claude | SDK + generic proxy |

## SDK

Add one script tag to any project:

```html
<script src="https://magiclink.reneebe.workers.dev/sdk.js" data-project="your-project-id"></script>
```

Then check `window.magiclink.hasToken` in your code to detect demo mode.

For Chrome extensions, a content script on `magiclink.reneebe.workers.dev` syncs the token from the page's `localStorage` into `chrome.storage.local`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Landing page (or welcome page with `?token=`) |
| POST | `/request` | Request a demo link (email) |
| GET | `/sdk.js` | SDK script |
| POST | `/api/proxy` | Generic proxy (claude/gemini) |
| POST | `/api/projects/theme-generator` | Theme generation proxy |
| POST | `/api/projects/persist` | Demo capture storage |
| POST | `/api/projects/ai-video-searcher/upload` | Video upload proxy |
| GET | `/admin` | Admin UI |

## Stack

- Cloudflare Workers + Hono
- Cloudflare KV for tokens and demo data
- Vanilla JS IIFE SDK (no dependencies)

## Development

```bash
npm install
npx wrangler dev
```

## Secrets

Set these via `wrangler secret put`:

- `ADMIN_PASSWORD`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
