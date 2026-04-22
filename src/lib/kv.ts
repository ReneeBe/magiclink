import type { TokenRecord, EmailRecord, VisitorPool } from './types'

// ── Token records ──────────────────────────────────────────────────────────

export async function getTokenRecord(kv: KVNamespace, token: string): Promise<TokenRecord | null> {
  return kv.get<TokenRecord>(`token:${token}`, 'json')
}

export async function setTokenRecord(kv: KVNamespace, token: string, record: TokenRecord): Promise<void> {
  await kv.put(`token:${token}`, JSON.stringify(record))
}

export async function getAllTokens(kv: KVNamespace): Promise<Array<TokenRecord & { token: string }>> {
  const list = await kv.list({ prefix: 'token:' })
  const records = await Promise.all(
    list.keys.map(async (key) => {
      const record = await kv.get<TokenRecord>(key.name, 'json')
      return record ? { ...record, token: key.name.replace('token:', '') } : null
    })
  )
  return records.filter(Boolean) as Array<TokenRecord & { token: string }>
}

// ── Email records ──────────────────────────────────────────────────────────

export async function getEmailRecord(kv: KVNamespace, email: string): Promise<EmailRecord | null> {
  return kv.get<EmailRecord>(`email:${email}`, 'json')
}

export async function setEmailRecord(kv: KVNamespace, email: string, record: EmailRecord): Promise<void> {
  await kv.put(`email:${email}`, JSON.stringify(record))
}

// ── Visitor pool ───────────────────────────────────────────────────────────

function visitorKey(projectId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `visitor:${projectId}:${date}`
}

export async function getVisitorPool(kv: KVNamespace, projectId: string): Promise<VisitorPool> {
  const record = await kv.get<VisitorPool>(visitorKey(projectId), 'json')
  return record ?? { count: 0 }
}

export async function incrementVisitorPool(kv: KVNamespace, projectId: string): Promise<number> {
  const key = visitorKey(projectId)
  const record = await kv.get<VisitorPool>(key, 'json') ?? { count: 0 }
  record.count += 1
  // Expire at end of day (24h TTL is close enough)
  await kv.put(key, JSON.stringify(record), { expirationTtl: 86400 })
  return record.count
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  timestamp: string
  tokenType: 'recruiter' | 'personal' | 'visitor'
  projectId: string
  tokenPrefix?: string // first 8 chars for identification
  visitorId?: string // hashed IP for visitor differentiation
}

export async function logAnalyticsEvent(kv: KVNamespace, event: AnalyticsEvent): Promise<void> {
  const date = new Date().toISOString().split('T')[0]
  const key = `analytics:${date}`
  const existing = await kv.get<AnalyticsEvent[]>(key, 'json') ?? []
  existing.push(event)
  await kv.put(key, JSON.stringify(existing), { expirationTtl: 90 * 86400 }) // 90 day retention
}

export async function getAnalytics(kv: KVNamespace, days: number = 30): Promise<AnalyticsEvent[]> {
  const events: AnalyticsEvent[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
    const dayEvents = await kv.get<AnalyticsEvent[]>(`analytics:${date}`, 'json')
    if (dayEvents) events.push(...dayEvents)
  }
  return events
}
