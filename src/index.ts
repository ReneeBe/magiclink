import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './lib/types'
import { generateToken } from './lib/token'
import {
  getTokenRecord, setTokenRecord, getEmailRecord, setEmailRecord, getAllTokens,
  getVisitorPool, incrementVisitorPool, logAnalyticsEvent, getAnalytics,
} from './lib/kv'
import { proxyRequest } from './lib/proxy'
import { landingPage } from './views/landing'
import { welcomePage } from './views/welcome'
import { adminPage } from './views/admin'
import { dashboardPage } from './views/dashboard'

const app = new Hono<{ Bindings: Env }>()

const RECRUITER_LIMIT = 20
const VISITOR_DAILY_LIMIT = 5

app.use('/api/*', cors({ origin: '*' }))
app.use('/sdk.js', cors({ origin: '*' }))

// ─── Public ──────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const token = c.req.query('token')
  if (token) {
    const record = await getTokenRecord(c.env.MAGICLINK, token)
    if (!record) return c.html(welcomePage({ valid: false }))
    const expired = new Date() > new Date(record.expiresAt)
    return c.html(welcomePage({
      valid: !expired,
      email: record.email,
      expiresAt: record.expiresAt,
      token,
      totalUses: record.totalUses,
      limit: record.limit,
    }))
  }
  return c.html(landingPage())
})

// Resume link: creates a new token per visitor
app.get('/resume', async (c) => {
  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await setTokenRecord(c.env.MAGICLINK, token, {
    email: 'resume-visitor',
    type: 'recruiter',
    totalUses: 0,
    limit: RECRUITER_LIMIT,
    projects: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    source: 'resume',
  })

  const origin = new URL(c.req.url).origin
  return c.redirect(`${origin}/?token=${token}`)
})

app.post('/request', async (c) => {
  const body = await c.req.json<{ email?: string }>()
  const email = body.email?.toLowerCase().trim()

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Please enter a valid email address.' }, 400)
  }

  const existing = await getEmailRecord(c.env.MAGICLINK, email)
  if (existing) {
    return c.json({ exists: true })
  }

  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await setEmailRecord(c.env.MAGICLINK, email, { token, requestedAt: now.toISOString() })
  await setTokenRecord(c.env.MAGICLINK, token, {
    email,
    type: 'recruiter',
    totalUses: 0,
    limit: RECRUITER_LIMIT,
    projects: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    source: 'direct',
  })

  const origin = new URL(c.req.url).origin
  const magicLink = `${origin}/?token=${token}`

  return c.json({ success: true, link: magicLink })
})

// ─── SDK ─────────────────────────────────────────────────────────────────────

app.get('/sdk.js', (c) => {
  c.header('Content-Type', 'application/javascript; charset=utf-8')
  c.header('Cache-Control', 'public, max-age=3600')
  return c.body(SDK_SOURCE)
})

// ─── API (used by projects) ───────────────────────────────────────────────────

app.post('/api/proxy', async (c) => {
  const body = await c.req.json<{
    token?: string
    projectId?: string
    provider?: 'claude' | 'gemini'
    request?: unknown
  }>()

  const { token, projectId, provider, request } = body

  if (!projectId || !provider || !request) {
    return c.json({ error: 'Missing required fields: projectId, provider, request' }, 400)
  }

  if (provider !== 'claude' && provider !== 'gemini') {
    return c.json({ error: 'provider must be "claude" or "gemini"' }, 400)
  }

  const apiKey = provider === 'claude' ? c.env.ANTHROPIC_API_KEY : c.env.GEMINI_API_KEY

  // ── Personal token: unlimited ──
  if (token && token === c.env.PERSONAL_TOKEN) {
    let result: unknown
    try {
      result = await proxyRequest(provider, request, apiKey)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Proxy request failed' }, 502)
    }

    await logAnalyticsEvent(c.env.MAGICLINK, {
      timestamp: new Date().toISOString(),
      tokenType: 'personal',
      projectId,
    })

    return c.json({ result, usage: { unlimited: true } })
  }

  // ── Recruiter token: 20 total uses across all projects ──
  if (token) {
    const record = await getTokenRecord(c.env.MAGICLINK, token)
    if (!record) {
      return c.json({ error: 'Invalid token.' }, 401)
    }

    if (new Date() > new Date(record.expiresAt)) {
      return c.json({ error: 'Your demo access has expired.', exhausted: true }, 403)
    }

    if (record.totalUses >= record.limit) {
      return c.json({
        error: 'exhausted',
        exhausted: true,
        message: "You've used all your demo credits. If you're interested in continuing with my projects, you can find the source code on GitHub. If you're interested in working with me, please reach out at ReneeLBerger@gmail.com.",
      }, 429)
    }

    let result: unknown
    try {
      result = await proxyRequest(provider, request, apiKey)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Proxy request failed' }, 502)
    }

    record.totalUses += 1
    record.projects[projectId] = (record.projects[projectId] ?? 0) + 1
    await setTokenRecord(c.env.MAGICLINK, token, record)

    await logAnalyticsEvent(c.env.MAGICLINK, {
      timestamp: new Date().toISOString(),
      tokenType: 'recruiter',
      projectId,
      tokenPrefix: token.slice(0, 8),
    })

    return c.json({
      result,
      usage: {
        count: record.totalUses,
        limit: record.limit,
        remaining: record.limit - record.totalUses,
      },
    })
  }

  // ── Visitor pool: 5 per project per day ──
  const pool = await getVisitorPool(c.env.MAGICLINK, projectId)

  if (pool.count >= VISITOR_DAILY_LIMIT) {
    return c.json({
      error: 'exhausted',
      exhausted: true,
      message: "Today's demo uses for this project have been reached. If you're interested in continuing with my projects, you can find the source code on GitHub. If you're interested in working with me, please reach out at ReneeLBerger@gmail.com.",
    }, 429)
  }

  let result: unknown
  try {
    result = await proxyRequest(provider, request, apiKey)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Proxy request failed' }, 502)
  }

  const newCount = await incrementVisitorPool(c.env.MAGICLINK, projectId)

  await logAnalyticsEvent(c.env.MAGICLINK, {
    timestamp: new Date().toISOString(),
    tokenType: 'visitor',
    projectId,
  })

  return c.json({
    result,
    usage: {
      count: newCount,
      limit: VISITOR_DAILY_LIMIT,
      remaining: VISITOR_DAILY_LIMIT - newCount,
    },
  })
})

// ─── Project-specific endpoints ──────────────────────────────────────────────

// Helper to validate token or visitor pool
async function checkAccess(
  kv: KVNamespace,
  personalToken: string,
  token: string | undefined,
  projectId: string
): Promise<
  | { allowed: true; tokenType: 'personal' | 'recruiter' | 'visitor'; record?: import('./lib/types').TokenRecord }
  | { allowed: false; status: number; body: unknown }
> {
  if (token && token === personalToken) {
    return { allowed: true, tokenType: 'personal' }
  }

  if (token) {
    const record = await getTokenRecord(kv, token)
    if (!record) return { allowed: false, status: 401, body: { error: 'Invalid token.' } }
    if (new Date() > new Date(record.expiresAt)) return { allowed: false, status: 403, body: { error: 'Expired.', exhausted: true } }
    if (record.totalUses >= record.limit) {
      return { allowed: false, status: 429, body: { error: 'exhausted', exhausted: true, message: "You've used all your demo credits. If you're interested in continuing with my projects, you can find the source code on GitHub. If you're interested in working with me, please reach out at ReneeLBerger@gmail.com." } }
    }
    return { allowed: true, tokenType: 'recruiter', record }
  }

  const pool = await getVisitorPool(kv, projectId)
  if (pool.count >= VISITOR_DAILY_LIMIT) {
    return { allowed: false, status: 429, body: { error: 'exhausted', exhausted: true, message: "Today's demo uses for this project have been reached. If you're interested in continuing with my projects, you can find the source code on GitHub. If you're interested in working with me, please reach out at ReneeLBerger@gmail.com." } }
  }

  return { allowed: true, tokenType: 'visitor' }
}

async function trackUsage(
  kv: KVNamespace,
  tokenType: 'personal' | 'recruiter' | 'visitor',
  projectId: string,
  token?: string,
  record?: import('./lib/types').TokenRecord
) {
  if (tokenType === 'recruiter' && token && record) {
    record.totalUses += 1
    record.projects[projectId] = (record.projects[projectId] ?? 0) + 1
    await setTokenRecord(kv, token, record)
  }
  if (tokenType === 'visitor') {
    await incrementVisitorPool(kv, projectId)
  }
  await logAnalyticsEvent(kv, {
    timestamp: new Date().toISOString(),
    tokenType,
    projectId,
    ...(token ? { tokenPrefix: token.slice(0, 8) } : {}),
  })
}

// Theme generator: just check access and track usage, client calls the worker directly
app.post('/api/projects/theme-generator/check', async (c) => {
  const body = await c.req.json<{ token?: string }>()
  const { token } = body
  const projectId = 'theme-generator'

  const access = await checkAccess(c.env.MAGICLINK, c.env.PERSONAL_TOKEN, token, projectId)
  if (!access.allowed) return c.json(access.body, access.status as 401 | 403 | 429)

  await trackUsage(c.env.MAGICLINK, access.tokenType, projectId, token, access.record)
  return c.json({ allowed: true })
})

app.post('/api/projects/persist', async (c) => {
  const body = await c.req.json<{
    token?: string; action?: 'capture' | 'list' | 'toggle' | 'delete'
    url?: string; title?: string; content?: string; id?: string; shared?: boolean
  }>()
  const { token, action } = body
  const projectId = 'persist'

  if (!action) return c.json({ error: 'Missing field: action' }, 400)

  const access = await checkAccess(c.env.MAGICLINK, c.env.PERSONAL_TOKEN, token, projectId)
  if (!access.allowed) return c.json(access.body, access.status as 401 | 403 | 429)

  const storageKey = token ? `persist_demo:${token}` : `persist_demo:visitor`
  type DemoItem = { id: string; url: string; title: string; content: string; captured_at: string; shared: 0 | 1 }
  const stored = await c.env.MAGICLINK.get(storageKey)
  const items: DemoItem[] = stored ? JSON.parse(stored) : []

  if (action === 'list') {
    return c.json(items.map(({ id, url, title, captured_at, shared }) => ({ id, url, title, captured_at, shared })))
  }

  if (action === 'capture') {
    const { url: pageUrl, title, content } = body
    if (!pageUrl || !title || !content) return c.json({ error: 'Missing fields: url, title, content' }, 400)

    const id = crypto.randomUUID()
    const captured_at = new Date().toISOString()
    items.unshift({ id, url: pageUrl, title, content, captured_at, shared: 0 })
    await c.env.MAGICLINK.put(storageKey, JSON.stringify(items))

    await trackUsage(c.env.MAGICLINK, access.tokenType, projectId, token, access.record)
    return c.json({ id, capturedAt: captured_at })
  }

  if (action === 'toggle') {
    const { id, shared } = body
    if (!id || shared === undefined) return c.json({ error: 'Missing fields: id, shared' }, 400)
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return c.json({ error: 'Not found' }, 404)
    items[idx].shared = shared ? 1 : 0
    await c.env.MAGICLINK.put(storageKey, JSON.stringify(items))
    return c.json({ ok: true })
  }

  if (action === 'delete') {
    const { id } = body
    if (!id) return c.json({ error: 'Missing field: id' }, 400)
    const filtered = items.filter((i) => i.id !== id)
    await c.env.MAGICLINK.put(storageKey, JSON.stringify(filtered))
    return c.json({ ok: true })
  }

  return c.json({ error: 'Unknown action' }, 400)
})

app.post('/api/projects/ai-video-searcher/upload', async (c) => {
  const formData = await c.req.formData()
  const token = formData.get('token') as string | null
  const file = formData.get('file') as File | null
  const projectId = 'ai-video-searcher'

  if (!file) return c.json({ error: 'Missing file' }, 400)

  const access = await checkAccess(c.env.MAGICLINK, c.env.PERSONAL_TOKEN, token ?? undefined, projectId)
  if (!access.allowed) return c.json(access.body, access.status as 401 | 403 | 429)

  try {
    const metadataJson = JSON.stringify({ file: { display_name: file.name } })
    const fileBytes = await file.arrayBuffer()
    const boundary = `gemini_upload_${Date.now()}`
    const encoder = new TextEncoder()

    const part1 = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadataJson}\r\n`)
    const part2Header = encoder.encode(`--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`)
    const part2Footer = encoder.encode(`\r\n--${boundary}--`)

    const total = part1.length + part2Header.length + fileBytes.byteLength + part2Footer.length
    const combined = new Uint8Array(total)
    combined.set(part1, 0)
    combined.set(part2Header, part1.length)
    combined.set(new Uint8Array(fileBytes), part1.length + part2Header.length)
    combined.set(part2Footer, part1.length + part2Header.length + fileBytes.byteLength)

    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${c.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: combined }
    )

    if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`)

    type FileInfo = { name: string; uri: string; mimeType: string; displayName: string; state: string }
    const uploadData = await uploadRes.json() as { file: FileInfo }
    const fileInfo = uploadData.file

    for (let i = 0; i < 15; i++) {
      const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileInfo.name}?key=${c.env.GEMINI_API_KEY}`)
      const statusData = await statusRes.json() as { state: string }
      if (statusData.state === 'ACTIVE') break
      if (statusData.state === 'FAILED') throw new Error('File processing failed')
      await new Promise(r => setTimeout(r, 2000))
    }

    await trackUsage(c.env.MAGICLINK, access.tokenType, projectId, token ?? undefined, access.record)

    return c.json({
      name: fileInfo.name, uri: fileInfo.uri, mimeType: fileInfo.mimeType, displayName: fileInfo.displayName,
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Upload failed' }, 502)
  }
})

// ─── Admin ───────────────────────────────────────────────────────────────────

app.get('/admin', (c) => c.html(adminPage()))
app.get('/admin/dashboard', (c) => c.html(dashboardPage()))

app.post('/admin/generate', async (c) => {
  if (c.req.header('X-Admin-Password') !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json<{ email?: string }>()
  const email = body.email?.toLowerCase().trim()

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Invalid email address' }, 400)
  }

  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await setEmailRecord(c.env.MAGICLINK, email, { token, requestedAt: now.toISOString() })
  await setTokenRecord(c.env.MAGICLINK, token, {
    email,
    type: 'recruiter',
    totalUses: 0,
    limit: RECRUITER_LIMIT,
    projects: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    source: 'admin',
  })

  const origin = new URL(c.req.url).origin
  return c.json({
    success: true,
    token,
    link: `${origin}/?token=${token}`,
    resumeLink: `${origin}/resume`,
    expiresAt: expiresAt.toISOString(),
  })
})

app.get('/admin/stats', async (c) => {
  if (c.req.header('X-Admin-Password') !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const tokens = await getAllTokens(c.env.MAGICLINK)
  return c.json({ tokens })
})

app.get('/admin/analytics', async (c) => {
  if (c.req.header('X-Admin-Password') !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const days = parseInt(c.req.query('days') ?? '30', 10)
  const events = await getAnalytics(c.env.MAGICLINK, days)

  // Aggregate
  const byProject: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byDay: Record<string, number> = {}

  for (const e of events) {
    byProject[e.projectId] = (byProject[e.projectId] ?? 0) + 1
    byType[e.tokenType] = (byType[e.tokenType] ?? 0) + 1
    const day = e.timestamp.split('T')[0]
    byDay[day] = (byDay[day] ?? 0) + 1
  }

  return c.json({
    total: events.length,
    byProject,
    byType,
    byDay,
    recentEvents: events.slice(0, 100),
  })
})

// ─── SDK source (vanilla JS IIFE) ───────────────────────────────────────────

const SDK_SOURCE = `(function () {
  'use strict';

  var script = document.currentScript;
  var BASE_URL = script ? new URL(script.src).origin : '';
  var PROJECT_ID = script ? (script.dataset.project || null) : null;

  // Capture token from URL and save to localStorage
  var params = new URLSearchParams(window.location.search);
  var urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('magiclink_token', urlToken);
    params.delete('token');
    var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    history.replaceState(null, '', clean);
  }

  var token = localStorage.getItem('magiclink_token');

  function showExhaustedPopup(message) {
    if (document.getElementById('ml-exhausted-popup')) return;
    var overlay = document.createElement('div');
    overlay.id = 'ml-exhausted-popup';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:2rem;';
    var card = document.createElement('div');
    card.style.cssText = 'background:#1a1a2e;color:#e2e2f0;border-radius:1rem;padding:2rem;max-width:420px;width:100%;text-align:center;font-family:system-ui,sans-serif;';
    card.innerHTML = '<h2 style="font-size:1.2rem;margin-bottom:0.75rem;">Demo Limit Reached</h2>'
      + '<p style="font-size:0.9rem;color:#9090b0;line-height:1.6;margin-bottom:1.25rem;">' + message + '</p>'
      + '<div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">'
      + '<a href="https://github.com/ReneeBe" target="_blank" style="background:#7c6af7;color:#fff;padding:0.6rem 1.2rem;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.85rem;">View Source on GitHub</a>'
      + '<a href="mailto:ReneeLBerger@gmail.com" style="background:rgba(124,106,247,0.15);color:#c0b8f7;padding:0.6rem 1.2rem;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.85rem;">Get in Touch</a>'
      + '</div>';
    overlay.appendChild(card);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function proxy(provider, request) {
    if (!PROJECT_ID) {
      return Promise.reject(new Error('MagicLink: add data-project="your-project-id" to the script tag.'));
    }
    var body = { projectId: PROJECT_ID, provider: provider, request: request };
    if (token) body.token = token;

    return fetch(BASE_URL + '/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (data.exhausted) {
          showExhaustedPopup(data.message || "You\\'ve used all your demo credits.");
          throw Object.assign(new Error('Demo limit reached'), data);
        }
        if (!res.ok) throw Object.assign(new Error(data.error || 'MagicLink proxy error'), data);
        return data;
      });
    });
  }

  window.magiclink = {
    hasToken: !!token,
    isVisitor: !token,
    projectId: PROJECT_ID,
    claude: function (params) { return proxy('claude', params); },
    gemini: function (params) { return proxy('gemini', params); },
    clearToken: function () { localStorage.removeItem('magiclink_token'); token = null; window.magiclink.hasToken = false; window.magiclink.isVisitor = true; }
  };
})();`

export default app
