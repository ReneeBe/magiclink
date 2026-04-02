export function adminPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MagicLink Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f0f13;
      color: #e2e2f0;
      min-height: 100dvh;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
    }
    .header { max-width: 800px; margin: 0 auto 2rem; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1rem; font-weight: 700; color: #6b6b8a; }
    .logo span { color: #7c6af7; }
    .container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .card {
      background: #1a1a24;
      border: 1px solid #2e2e3e;
      border-radius: 1rem;
      padding: 1.75rem;
    }
    .card-title { font-size: 0.85rem; font-weight: 600; color: #e2e2f0; margin-bottom: 1.25rem; }
    label { font-size: 0.8rem; color: #9090b0; display: block; margin-bottom: 0.4rem; }
    input[type="text"], input[type="password"], input[type="email"] {
      width: 100%;
      padding: 0.65rem 0.875rem;
      border-radius: 0.5rem;
      border: 1px solid #2e2e3e;
      background: #0f0f13;
      color: #e2e2f0;
      font-size: 0.875rem;
      outline: none;
      margin-bottom: 0.875rem;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #7c6af7; }
    .row { display: flex; gap: 0.75rem; align-items: flex-end; }
    .row input { margin-bottom: 0; }
    button {
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      border: none;
      background: #7c6af7;
      color: #fff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.88; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.secondary {
      background: transparent;
      border: 1px solid #2e2e3e;
      color: #9090b0;
    }
    button.secondary:hover { border-color: #7c6af7; color: #e2e2f0; opacity: 1; }
    .result {
      margin-top: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.83rem;
      line-height: 1.6;
      display: none;
    }
    .result.success { background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.25); color: #4ade80; }
    .result.error { background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); color: #f87171; }
    .result .link { word-break: break-all; margin-top: 0.5rem; color: #b8b0f8; }
    .copy-btn {
      background: transparent;
      border: 1px solid rgba(124,106,247,0.4);
      color: #b8b0f8;
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      border-radius: 0.4rem;
      margin-top: 0.5rem;
      display: inline-block;
    }
    .copy-btn:hover { background: rgba(124,106,247,0.1); opacity: 1; }
    table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
    th { text-align: left; padding: 0.5rem 0.75rem; color: #6b6b8a; font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #2e2e3e; }
    td { padding: 0.75rem; border-bottom: 1px solid #1e1e2a; color: #9090b0; vertical-align: top; }
    td:first-child { color: #e2e2f0; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.3rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge.active { background: rgba(74,222,128,0.1); color: #4ade80; }
    .badge.expired { background: rgba(248,113,113,0.1); color: #f87171; }
    .empty { color: #5a5a7a; font-size: 0.85rem; padding: 1rem 0; }
    #auth-gate { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; }
    #auth-gate .card { width: 100%; max-width: 360px; }
    #main { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">magic<span>key</span> <span style="color:#3a3a4a;font-weight:400;">admin</span></div>
  </div>

  <div id="auth-gate">
    <div class="card">
      <div class="card-title">Sign in</div>
      <label>Admin password</label>
      <input type="password" id="password-input" placeholder="••••••••" />
      <button id="auth-btn" onclick="authenticate()">Continue</button>
      <div class="result error" id="auth-error">Incorrect password.</div>
    </div>
  </div>

  <div id="main" class="container">
    <div class="card">
      <div class="card-title">Generate magic link</div>
      <label>Recruiter email</label>
      <div class="row">
        <input type="email" id="gen-email" placeholder="recruiter@company.com" />
        <button onclick="generateLink()">Generate</button>
      </div>
      <div id="gen-result" class="result"></div>
    </div>

    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
        Usage stats
        <button class="secondary" onclick="loadStats()">Refresh</button>
      </div>
      <div id="stats-content"><p class="empty">Loading...</p></div>
    </div>
  </div>

  <script>
    let password = ''

    async function authenticate() {
      const btn = document.getElementById('auth-btn')
      const input = document.getElementById('password-input')
      const err = document.getElementById('auth-error')
      err.style.display = 'none'
      btn.disabled = true

      const res = await fetch('/admin/stats', {
        headers: { 'X-Admin-Password': input.value }
      })

      if (res.ok) {
        password = input.value
        localStorage.setItem('ml_admin_pw', password)
        document.getElementById('auth-gate').style.display = 'none'
        document.getElementById('main').style.display = 'flex'
        loadStats()
      } else {
        err.style.display = 'block'
        btn.disabled = false
      }
    }

    async function generateLink() {
      const email = document.getElementById('gen-email').value.trim()
      const result = document.getElementById('gen-result')
      result.style.display = 'none'

      if (!email) return

      const res = await fetch('/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ email, overwrite: true })
      })
      const data = await res.json()

      if (data.success) {
        result.className = 'result success'
        result.innerHTML = \`
          Link generated for <strong>\${email}</strong><br>
          <span class="link">\${data.link}</span><br>
          <button class="copy-btn" onclick="copyLink('\${data.link}')">Copy link</button>
          <span style="font-size:0.75rem;color:#6b6b8a;margin-left:8px;">Expires \${new Date(data.expiresAt).toLocaleDateString()}</span>
        \`
        result.style.display = 'block'
        loadStats()
      } else {
        result.className = 'result error'
        result.textContent = data.error || 'Failed to generate link.'
        result.style.display = 'block'
      }
    }

    async function loadStats() {
      const container = document.getElementById('stats-content')
      const res = await fetch('/admin/stats', { headers: { 'X-Admin-Password': password } })
      if (!res.ok) { container.innerHTML = '<p class="empty">Failed to load stats.</p>'; return }
      const { tokens } = await res.json()

      if (!tokens.length) {
        container.innerHTML = '<p class="empty">No tokens generated yet.</p>'
        return
      }

      const now = new Date()
      const rows = tokens.map(t => {
        const expired = new Date(t.expiresAt) < now
        const projectList = Object.entries(t.projects)
          .map(([p, n]) => \`\${p}: \${n}/5\`)
          .join(', ') || '—'
        const badge = expired
          ? '<span class="badge expired">Expired</span>'
          : '<span class="badge active">Active</span>'
        return \`<tr>
          <td>\${t.email}</td>
          <td>\${badge}</td>
          <td>\${projectList}</td>
          <td>\${new Date(t.expiresAt).toLocaleDateString()}</td>
        </tr>\`
      }).join('')

      container.innerHTML = \`
        <table>
          <thead><tr><th>Email</th><th>Status</th><th>Usage</th><th>Expires</th></tr></thead>
          <tbody>\${rows}</tbody>
        </table>
      \`
    }

    function copyLink(link) {
      navigator.clipboard.writeText(link)
    }

    // Auto-login if password saved
    const saved = localStorage.getItem('ml_admin_pw')
    if (saved) {
      document.getElementById('password-input').value = saved
      authenticate()
    }

    document.getElementById('password-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') authenticate()
    })
    document.getElementById('gen-email').addEventListener('keydown', e => {
      if (e.key === 'Enter') generateLink()
    })
  </script>
</body>
</html>`
}
