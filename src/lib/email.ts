export async function sendMagicLinkEmail(
  resendApiKey: string,
  from: string,
  to: string,
  magicLink: string,
  expiresAt: Date
): Promise<void> {
  const expiry = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'MagicKey <onboarding@resend.dev>',
      to,
      subject: 'Your demo access — Renee Berger Portfolio',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a2e;background:#fff;">
          <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7c6af7;margin:0 0 12px;font-weight:600;">MagicKey Demo Access</p>
          <h1 style="font-size:26px;font-weight:700;margin:0 0 12px;letter-spacing:-0.02em;">Your demo link is ready</h1>
          <p style="color:#555;margin:0 0 32px;line-height:1.6;">Click below to activate access to the AI-powered projects in my portfolio. No API key needed — I've got you covered.</p>

          <a href="${magicLink}" style="display:inline-block;background:#7c6af7;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:36px;">
            Activate Demo Access →
          </a>

          <div style="background:#f5f5f8;border-radius:10px;padding:18px 20px;margin-bottom:28px;">
            <p style="margin:0 0 10px;font-weight:600;font-size:14px;">What this gives you</p>
            <ul style="margin:0;padding-left:18px;color:#555;font-size:14px;line-height:1.8;">
              <li>5 uses per AI-powered project</li>
              <li>No API key required on your end</li>
              <li>Works across all compatible projects</li>
              <li>Expires ${expiry}</li>
            </ul>
          </div>

          <p style="font-size:13px;color:#999;line-height:1.6;">
            Want more access after your credits run out? Just reply to this email or reach out at
            <a href="mailto:ReneeLBerger@gmail.com" style="color:#7c6af7;">ReneeLBerger@gmail.com</a> — happy to help.
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}
