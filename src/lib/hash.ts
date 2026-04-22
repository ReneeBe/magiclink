/** Hash an IP address to a short anonymous identifier */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + ':magiclink-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes.slice(0, 4), b => b.toString(16).padStart(2, '0')).join('')
}
