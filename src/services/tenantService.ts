import axios from "axios";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
})

const unwrap = (res: any) => res.data?.data ?? res.data

export async function getTenant(_id?: string): Promise<any> {
  const res = await axios.get('/api/tenants/me', { headers: getHeaders() })
  return unwrap(res)
}

export async function getLease(_id?: string): Promise<any> {
  const res = await axios.get('/api/leases/my', { headers: getHeaders() })
  return unwrap(res)
}

export async function getPayments(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/payments/my', { headers: getHeaders() })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getMaintenanceRequests(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/maintenance/my', { headers: getHeaders() })
  const data = unwrap(res)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.requests)) return data.requests
  return []
}

export async function getMessages(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/messages/conversations', { headers: getHeaders() })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}
