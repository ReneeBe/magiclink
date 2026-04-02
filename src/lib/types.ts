export interface Env {
  MAGICLINK: KVNamespace
  ADMIN_PASSWORD: string
  RESEND_API_KEY: string
  RESEND_FROM: string
  ANTHROPIC_API_KEY: string
  GEMINI_API_KEY: string
}

export interface TokenRecord {
  email: string
  projects: Record<string, number>
  createdAt: string
  expiresAt: string
}

export interface EmailRecord {
  token: string
  requestedAt: string
}
