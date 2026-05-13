import axios from "axios"

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
})

const unwrap = (res: any) => res.data?.data ?? res.data

// ── Get all messages in a tenant's inbox (sent + received) ─────────────────
export async function getTenantMessages(tenantId: string): Promise<any[]> {
  const res = await axios.get(`/api/messages/tenant/${tenantId}`, { headers: getHeaders() })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

// ── Get unread messages for current user ──────────────────────────────────
export async function getUnreadMessages(): Promise<any[]> {
  const res = await axios.get('/api/messages/unread', { headers: getHeaders() })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

// ── Get full conversation thread ──────────────────────────────────────────
export async function getThread(threadId: string): Promise<{ thread_id: string; messages: any[]; total: number }> {
  const res = await axios.get(`/api/messages/thread/${threadId}`, { headers: getHeaders() })
  return unwrap(res)
}

// ── Send a message to management ──────────────────────────────────────────
export async function sendMessage(payload: {
  receiver_id: string
  tenant_id:   string
  body:        string
  subject?:    string
  direction:   'TENANT_TO_MANAGEMENT' | 'MANAGEMENT_TO_TENANT'
  thread_id?:  string
}): Promise<any> {
  const res = await axios.post('/api/messages/send', payload, { headers: getHeaders() })
  return unwrap(res)
}

// ── Mark all messages in a thread as read ─────────────────────────────────
export async function markThreadRead(threadId: string): Promise<void> {
  await axios.patch(`/api/messages/thread/${threadId}/read`, {}, { headers: getHeaders() })
}

// ── Get unread count (for badge) ──────────────────────────────────────────
export async function getUnreadCount(): Promise<number> {
  const res = await axios.get('/api/messages/unread/count', { headers: getHeaders() })
  const data = unwrap(res)
  return data?.unread_messages ?? 0
}

// ── Get manager user_id for the current tenant ───────────────────────────
export async function getMyManager(): Promise<string> {
  const res = await axios.get('/api/messages/my-manager', { headers: getHeaders() })
  const data = unwrap(res)
  return data?.manager_user_id ?? ''
}
