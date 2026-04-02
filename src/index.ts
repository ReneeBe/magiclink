import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './lib/types'
import { generateToken } from './lib/token'
import { getTokenRecord, setTokenRecord, getEmailRecord, setEmailRecord, getAllTokens } from './lib/kv'
import { sendMagicLinkEmail } from './lib/email'
import { proxyRequest } from './lib/proxy'
import { landingPage } from './views/landing'
import { welcomePage } from './views/welcome'
import { adminPage } from './views/admin'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors({ origin: '*' }))
app.use('/sdk.js', cors({ origin: '*' }))

// ─── Public ──────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const token = c.req.query('token')
  if (token) {
    const record = await getTokenRecord(c.env.MAGICLINK, token)
    if (!record) return c.html(welcomePage({ valid: false }))
    const expired = new Date() > new Date(record.expiresAt)
    return c.html(welcomePage({ valid: !expired, email: record.email, expiresAt: record.expiresAt }))
  }
  return c.html(landingPage())
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
    projects: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
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

  if (!token || !projectId || !provider || !request) {
    return c.json({ error: 'Missing required fields: token, projectId, provider, request' }, 400)
  }

  if (provider !== 'claude' && provider !== 'gemini') {
    return c.json({ error: 'provider must be "claude" or "gemini"' }, 400)
  }

  const record = await getTokenRecord(c.env.MAGICLINK, token)
  if (!record) {
    return c.json({ error: 'Invalid token. Visit your magic link to activate access.' }, 401)
  }

  if (new Date() > new Date(record.expiresAt)) {
    return c.json({
      error: 'Your demo access has expired. Email ReneeLBerger@gmail.com for a fresh link.',
    }, 403)
  }

  const LIMIT = 5
  const usageCount = record.projects[projectId] ?? 0

  if (usageCount >= LIMIT) {
    return c.json({
      error: `You've used all ${LIMIT} demo credits for this project. Email ReneeLBerger@gmail.com if you'd like more access.`,
      usageExhausted: true,
    }, 429)
  }

  const apiKey = provider === 'claude' ? c.env.ANTHROPIC_API_KEY : c.env.GEMINI_API_KEY

  let result: unknown
  try {
    result = await proxyRequest(provider, request, apiKey)
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Proxy request failed' }, 502)
  }

  record.projects[projectId] = usageCount + 1
  await setTokenRecord(c.env.MAGICLINK, token, record)

  return c.json({
    result,
    usage: {
      count: usageCount + 1,
      limit: LIMIT,
      remaining: LIMIT - usageCount - 1,
    },
  })
})

// ─── Project-specific endpoints ──────────────────────────────────────────────

app.post('/api/projects/theme-generator', async (c) => {
  const body = await c.req.json<{ token?: string; description?: string; backgroundStyle?: string }>()
  const { token, description, backgroundStyle } = body

  if (!token || !description) {
    return c.json({ error: 'Missing required fields: token, description' }, 400)
  }

  const record = await getTokenRecord(c.env.MAGICLINK, token)
  if (!record) {
    return c.json({ error: 'Invalid token. Visit your magic link to activate access.' }, 401)
  }

  if (new Date() > new Date(record.expiresAt)) {
    return c.json({ error: 'Your demo access has expired. Email ReneeLBerger@gmail.com for a fresh link.' }, 403)
  }

  const projectId = 'theme-generator'
  const LIMIT = 5
  const usageCount = record.projects[projectId] ?? 0

  if (usageCount >= LIMIT) {
    return c.json({
      error: `You've used all ${LIMIT} demo credits for Theme Generator. Email ReneeLBerger@gmail.com if you'd like more access.`,
      usageExhausted: true,
    }, 429)
  }

  let result: unknown
  try {
    const res = await fetch('https://nano-claude-theme-manager.reneebe.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        ...(backgroundStyle && { backgroundStyle }),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Theme generation failed: ${err}`)
    }

    result = await res.json()
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Theme generation failed' }, 502)
  }

  record.projects[projectId] = usageCount + 1
  await setTokenRecord(c.env.MAGICLINK, token, record)

  return c.json({
    result,
    usage: { count: usageCount + 1, limit: LIMIT, remaining: LIMIT - usageCount - 1 },
  })
})

// ─── Admin ───────────────────────────────────────────────────────────────────

app.get('/admin', (c) => c.html(adminPage()))

app.post('/admin/generate', async (c) => {
  if (c.req.header('X-Admin-Password') !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json<{ email?: string; overwrite?: boolean }>()
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
    projects: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })

  const origin = new URL(c.req.url).origin
  return c.json({
    success: true,
    token,
    link: `${origin}/?token=${token}`,
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

// ─── SDK source (vanilla JS IIFE, no dependencies) ───────────────────────────

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

  function proxy(provider, request) {
    if (!token) {
      return Promise.reject(new Error('MagicLink: no token found. Visit your magic link first.'));
    }
    if (!PROJECT_ID) {
      return Promise.reject(new Error('MagicLink: add data-project="your-project-id" to the <script> tag.'));
    }
    return fetch(BASE_URL + '/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, projectId: PROJECT_ID, provider: provider, request: request })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw Object.assign(new Error(data.error || 'MagicLink proxy error'), data);
        return data;
      });
    });
  }

  window.magiclink = {
    hasToken: !!token,
    projectId: PROJECT_ID,
    claude: function (params) { return proxy('claude', params); },
    gemini: function (params) { return proxy('gemini', params); },
    clearToken: function () { localStorage.removeItem('magiclink_token'); token = null; window.magiclink.hasToken = false; }
  };
})();`

export default app
