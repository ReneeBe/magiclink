interface WelcomeProps {
  valid: boolean
  email?: string
  expiresAt?: string
  token?: string
  totalUses?: number
  limit?: number
}

const PROJECTS = [
  { name: 'Theme Generator', url: 'https://reneebe.github.io/theme-generator/' },
  { name: 'Brain Dump Scheduler', url: 'https://reneebe.github.io/brain-dump-scheduler/' },
  { name: 'AI Video Searcher', url: 'https://reneebe.github.io/ai-video-timestamp-finder/' },
  { name: 'Photo Location Quiz', url: 'https://reneebe.github.io/photo-location-quiz/' },
  { name: 'Idea Explorer', url: 'https://reneebe.github.io/idea-explorer/' },
  { name: 'Haiku', url: 'https://reneebe.github.io/haiku/' },
  { name: 'Rosetta', url: 'https://reneebe.github.io/rosetta/' },
]

export function welcomePage({ valid, email, expiresAt, token, totalUses, limit }: WelcomeProps): string {
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const projectLinks = token
    ? PROJECTS.map(p => `<a class="project-link" href="${p.url}?token=${token}" target="_blank">${p.name} →</a>`).join('\n        ')
    : ''

  const remaining = limit && limit > 0 ? limit - (totalUses ?? 0) : null

  const content = valid
    ? `
      <p class="label">MagicLink</p>
      <h1>You're all set</h1>
      <p>Your demo access is active${email && email !== 'resume-visitor' ? ` for <strong>${email}</strong>` : ''}. You have <strong>${remaining ?? 0} uses</strong> remaining across all projects${expiry ? ` until ${expiry}` : ''}.</p>
      <div class="info">
        <p class="info-title">How it works</p>
        <ul>
          <li>Click any project below to start exploring</li>
          <li>You have ${limit} total uses shared across all projects</li>
          <li>Each AI-powered action counts as one use</li>
        </ul>
      </div>
      <div class="projects">
        <p class="info-title">Try these projects</p>
        ${projectLinks}
      </div>
      <p class="note">Used up your credits? If you're interested in working with me, email <a href="mailto:ReneeLBerger@gmail.com">ReneeLBerger@gmail.com</a>.</p>
    `
    : `
      <p class="label">MagicLink</p>
      <h1>Link not found</h1>
      <p>This magic link is invalid or has expired. Email <a href="mailto:ReneeLBerger@gmail.com">ReneeLBerger@gmail.com</a> to get a fresh one.</p>
    `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MagicLink — ${valid ? 'Access Activated' : 'Invalid Link'}</title>
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
    .projects { margin-bottom: 1.5rem; }
    .project-link {
      display: block;
      padding: 0.6rem 1rem;
      margin-top: 0.5rem;
      background: rgba(124, 106, 247, 0.08);
      border: 1px solid rgba(124, 106, 247, 0.15);
      border-radius: 0.6rem;
      color: #c0b8f7;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s;
    }
    .project-link:hover { background: rgba(124, 106, 247, 0.15); border-color: rgba(124, 106, 247, 0.3); }
    .note { font-size: 0.8rem; color: #5a5a7a; }
    .note a { color: #7c6af7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
  <script>
    var params = new URLSearchParams(window.location.search)
    var token = params.get('token')
    if (token) {
      localStorage.setItem('magiclink_token', token)
      params.delete('token')
      var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
      history.replaceState(null, '', newUrl)
    }
  </script>
</body>
</html>`
}
