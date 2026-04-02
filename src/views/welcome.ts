interface WelcomeProps {
  valid: boolean
  email?: string
  expiresAt?: string
}

export function welcomePage({ valid, email, expiresAt }: WelcomeProps): string {
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const content = valid
    ? `
      <p class="label">MagicKey</p>
      <h1>You're all set</h1>
      <p>Your demo access is active${email ? ` for <strong>${email}</strong>` : ''}. You now have <strong>5 uses per project</strong> across all of my AI-powered portfolio projects${expiry ? ` until ${expiry}` : ''}.</p>
      <div class="info">
        <p class="info-title">How it works</p>
        <ul>
          <li>Visit any of the compatible projects below</li>
          <li>The demo mode activates automatically — no setup needed</li>
          <li>Each project tracks its 5-use limit independently</li>
        </ul>
      </div>
      <a class="btn" href="https://reneebe.github.io/50projects/" target="_blank">Browse Projects →</a>
      <p class="note">Credits used up? Email <a href="mailto:ReneeLBerger@gmail.com">ReneeLBerger@gmail.com</a> — I'm happy to help.</p>
    `
    : `
      <p class="label">MagicKey</p>
      <h1>Link not found</h1>
      <p>This magic link is invalid or has expired. Email <a href="mailto:ReneeLBerger@gmail.com">ReneeLBerger@gmail.com</a> to get a fresh one.</p>
    `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MagicKey — ${valid ? 'Access Activated' : 'Invalid Link'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f0f13;
      color: #e2e2f0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: #1a1a24;
      border: 1px solid #2e2e3e;
      border-radius: 1.25rem;
      padding: 2.5rem;
    }
    .label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #7c6af7;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }
    p { font-size: 0.9rem; color: #9090b0; line-height: 1.6; margin-bottom: 1.25rem; }
    p strong { color: #e2e2f0; }
    p a { color: #7c6af7; text-decoration: none; }
    .info {
      background: rgba(124, 106, 247, 0.08);
      border: 1px solid rgba(124, 106, 247, 0.2);
      border-radius: 0.75rem;
      padding: 1.125rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .info-title { font-size: 0.8rem; font-weight: 600; color: #e2e2f0; margin-bottom: 0.6rem; }
    .info ul { padding-left: 1.125rem; color: #9090b0; font-size: 0.85rem; line-height: 1.8; }
    .btn {
      display: inline-block;
      background: #7c6af7;
      color: #fff;
      padding: 0.7rem 1.5rem;
      border-radius: 0.6rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.88; }
    .note { font-size: 0.8rem; color: #5a5a7a; }
    .note a { color: #7c6af7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
  <script>
    // Save token from URL to localStorage
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('magickey_token', token)
      params.delete('token')
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
      history.replaceState(null, '', newUrl)
    }
  </script>
</body>
</html>`
}
