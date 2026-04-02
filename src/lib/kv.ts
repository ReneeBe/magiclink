import type { TokenRecord, EmailRecord } from './types'

export async function getTokenRecord(kv: KVNamespace, token: string): Promise<TokenRecord | null> {
  return kv.get<TokenRecord>(`token:${token}`, 'json')
}

export async function setTokenRecord(kv: KVNamespace, token: string, record: TokenRecord): Promise<void> {
  await kv.put(`token:${token}`, JSON.stringify(record))
}

export async function getEmailRecord(kv: KVNamespace, email: string): Promise<EmailRecord | null> {
  return kv.get<EmailRecord>(`email:${email}`, 'json')
}

export async function setEmailRecord(kv: KVNamespace, email: string, record: EmailRecord): Promise<void> {
  await kv.put(`email:${email}`, JSON.stringify(record))
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
