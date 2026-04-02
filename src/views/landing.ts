export function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MagicKey — Demo Access</title>
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
      max-width: 420px;
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
    p {
      font-size: 0.9rem;
      color: #9090b0;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.6rem;
      border: 1px solid #2e2e3e;
      background: #0f0f13;
      color: #e2e2f0;
      font-size: 0.9rem;
      outline: none;
      margin-bottom: 0.75rem;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #7c6af7; }
    button {
      width: 100%;
      padding: 0.75rem;
      border-radius: 0.6rem;
      border: none;
      background: #7c6af7;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.88; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .message {
      margin-top: 1.25rem;
      padding: 0.875rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.85rem;
      line-height: 1.5;
      display: none;
    }
    .message.success { background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); color: #4ade80; }
    .message.error { background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); color: #f87171; }
    .message.exists { background: rgba(124, 106, 247, 0.1); border: 1px solid rgba(124, 106, 247, 0.3); color: #b8b0f8; }
    .send-note { font-size: 0.78rem; color: #5a5a7a; line-height: 1.5; margin-top: 0.75rem; }
    .send-note strong { color: #7070a0; font-weight: 500; }
    .footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #2e2e3e; font-size: 0.8rem; color: #5a5a7a; }
    .footer a { color: #7c6af7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <p class="label">MagicKey</p>
    <h1>Request demo access</h1>
    <p>Enter your email to receive a magic link with 5 free uses across each of my AI-powered portfolio projects — no API key required.</p>
    <form id="form">
      <input type="email" id="email" placeholder="you@example.com" required autocomplete="email" />
      <button type="submit" id="btn">Send my link</button>
      <p class="send-note">Your link will arrive from <strong>onboarding@resend.dev</strong> — check your spam if you don't see it within a minute.</p>
    </form>
    <div class="message success" id="msg-success">
      Check your inbox — your magic link is on its way.
    </div>
    <div class="message error" id="msg-error"></div>
    <div class="message exists" id="msg-exists">
      Looks like you've already requested a link. If you need help or want to demo my projects again without your own API key, email me at <a href="mailto:ReneeLBerger@gmail.com">ReneeLBerger@gmail.com</a> and I'm happy to help.
    </div>
    <div class="footer">
      Built by <a href="https://reneebe.github.io" target="_blank">Renee Berger</a>
    </div>
  </div>
  <script>
    const form = document.getElementById('form')
    const btn = document.getElementById('btn')
    const email = document.getElementById('email')

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      btn.disabled = true
      btn.textContent = 'Sending...'
      hideAll()

      try {
        const res = await fetch('/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value })
        })
        const data = await res.json()

        if (data.exists) {
          show('msg-exists')
        } else if (data.success) {
          show('msg-success')
          form.style.display = 'none'
        } else {
          showError(data.error || 'Something went wrong. Please try again.')
        }
      } catch {
        showError('Network error. Please try again.')
      } finally {
        btn.disabled = false
        btn.textContent = 'Send my link'
      }
    })

    function show(id) { document.getElementById(id).style.display = 'block' }
    function hideAll() {
      ['msg-success','msg-error','msg-exists'].forEach(id => {
        document.getElementById(id).style.display = 'none'
      })
    }
    function showError(msg) {
      const el = document.getElementById('msg-error')
      el.textContent = msg
      el.style.display = 'block'
    }
  </script>
</body>
</html>`
}
