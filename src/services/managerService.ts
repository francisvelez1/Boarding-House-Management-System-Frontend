import { BaseService } from './BaseService'

export interface ManagerDashboardPayload {
  rooms?: {
    total?: number
    vacant?: number
    occupied?: number
    reserved?: number
    under_maintenance?: number
    occupancy_rate_pct?: number
  }
  leases?: {
    total?: number
    active?: number
    pending?: number
    terminated?: number
    expired?: number
    expiring_soon?: number
  }
  maintenance?: {
    submitted?: number
    assigned?: number
    in_progress?: number
    completed?: number
    closed?: number
  }
}

export interface ManagerRoom {
  id: string
  room_number: string
  status: string
  current_occupants?: number
  capacity?: number
  max_occupants?: number
  monthly_rent?: number
  monthly_rate?: number
}

export interface ManagerLease {
  id: string
  tenant_id: string
  room_id: string
  status: string
  start_date: string
  end_date?: string | null
  monthly_rent?: number
}

export interface ManagerPayment {
  id: string
  tenant_id: string
  room_id: string
  amount: number
  method: string
  status: string
  payment_date: string
}

export interface ManagerMaintenance {
  id: string
  room_id: string
  title: string
  priority: string
  status: string
  created_at: string
  tenant_id?: string
  description?: string
  assigned_to?: string
}

export interface PaymentStats {
  total_payments?: number
  paid_count?: number
  unpaid_count?: number
  partial_count?: number
  total_collected?: number
  total_outstanding?: number
  monthly_revenue?: number
  monthly_collected?: number
}

export interface AnalyticsData {
  monthly_revenue: { month: string; revenue: number; target: number }[]
  collection_rate: number
  top_rooms: { room_id: string; room_number: string; total_earned: number }[]
  outstanding_tenants: { tenant_id: string; tenant_name: string; room_number: string; outstanding_balance: number; monthly_rate: number }[]
  occupancy: { total: number; occupied: number; vacant: number; rate_pct: number }
  occupancy_by_type: { type: string; occupied: number; total: number; pct: number }[]
  summary: { total_rooms: number; active_leases: number; total_payments: number; total_collected: number; total_outstanding: number }
}

export interface ManagerMessage {
  id: string
  sender_id: string
  receiver_id: string
  tenant_id: string
  tenant_name: string
  subject?: string
  body: string
  direction?: string
  status?: string
  thread_id?: string
  created_at?: string
  read_at?: string
}

export interface MessageableTenant {
  id: string
  user_id: string
  full_name: string
  email?: string
  phone?: string
  room_id?: string
}

class ManagerService extends BaseService {
  constructor() {
    super('/manager')
  }

  getDashboard(): Promise<ManagerDashboardPayload> {
    return this.get('/dashboard')
  }

  listRooms(limit = 50): Promise<ManagerRoom[]> {
    return this.get('/rooms', { params: { limit } })
  }

  listLeases(limit = 50): Promise<ManagerLease[]> {
    return this.get('/leases', { params: { limit } })
  }

  listPayments(): Promise<ManagerPayment[]> {
    return this.get('/payments')
  }

  listMaintenance(status?: string): Promise<ManagerMaintenance[]> {
    return this.get('/maintenance', status ? { params: { status } } : undefined)
  }

  getPaymentStats(): Promise<PaymentStats> {
    return this.get('/payments/stats')
  }

  async unassignTenant(tenantId: string): Promise<any> {
    return this.delete(`/tenants/${tenantId}/unassign`)
  }

  // ── Scoped tenants (only those in rooms this manager owns) ────────────
  // Backed by GET /api/manager/tenants — separate from the global
  // /api/tenants endpoint so admin tooling stays unfiltered.
  listTenants(limit = 100): Promise<any[]> {
    return this.get('/tenants', { params: { limit } })
  }

  getTenantStats(): Promise<{ total: number; active: number; pending: number }> {
    return this.get('/tenants/stats')
  }

  // ── Scoped booking requests (only applications for this manager's rooms) ─
  // Backed by GET /api/manager/bookings — separate from /api/bookings/manager/all
  // which returns every application in the system.
  listBookings(opts: { status?: string; limit?: number } = {}): Promise<{
    total: number
    skip: number
    limit: number
    bookings: any[]
  }> {
    return this.get('/bookings', { params: { ...opts } })
  }

  getAnalytics(): Promise<AnalyticsData> {
    return this.get('/analytics')
  }

  getMessages(): Promise<ManagerMessage[]> {
    return this.get('/messages')
  }

  getMessageableTenants(): Promise<MessageableTenant[]> {
    return this.get('/messages/tenants')
  }

  sendMessage(payload: { receiver_id: string; tenant_id: string; body: string; subject?: string; thread_id?: string }): Promise<any> {
    return this.post('/messages/send', payload)
  }

  getThread(threadId: string): Promise<ManagerMessage[]> {
    return this.get(`/messages/thread/${threadId}`)
  }
}

export const managerService = new ManagerService()