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
  monthly_rent?: number
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
}

export const managerService = new ManagerService()
