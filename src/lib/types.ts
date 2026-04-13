export interface Env {
  MAGICLINK: KVNamespace
  ADMIN_PASSWORD: string
  RESEND_API_KEY: string
  RESEND_FROM: string
  ANTHROPIC_API_KEY: string
  GEMINI_API_KEY: string
  PERSONAL_TOKEN: string
}

export type TokenType = 'recruiter' | 'personal'

export interface TokenRecord {
  email: string
  type: TokenType
  totalUses: number
  limit: number // 20 for recruiter, -1 for personal (unlimited)
  projects: Record<string, number> // per-project breakdown for analytics
  createdAt: string
  expiresAt: string
  source: 'direct' | 'resume' | 'admin'
}

export interface EmailRecord {
  token: string
  requestedAt: string
}

export interface VisitorPool {
  count: number
}
