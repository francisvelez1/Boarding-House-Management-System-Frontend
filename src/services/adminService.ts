import { BaseService } from './BaseService'

export type AdminRole = 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_MAINTENANCE' | 'ROLE_TENANT'
export type AdminStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

export interface AdminUserSummary {
  id: string
  username: string
  email: string
  full_name?: string | null
  role: AdminRole
  status: AdminStatus
  last_login?: string | null
  created_at: string
}

export interface AdminUserListResponse {
  total: number
  page: number
  limit: number
  users: AdminUserSummary[]
}

export interface AdminStatsResponse {
  total: number
  active: number
  inactive: number
  suspended: number
  by_role: {
    admin: number
    manager: number
    maintenance: number
    tenant: number
  }
}

type UserQuery = {
  page?: number
  limit?: number
  role?: AdminRole
  status?: AdminStatus
  search?: string
}

class AdminService extends BaseService {
  constructor() { super('/admin') }

  listUsers(params: UserQuery = {}): Promise<AdminUserListResponse> {
    return this.get('/users', { params })
  }

  getStats(): Promise<AdminStatsResponse> {
    return this.get('/stats')
  }

  updateRole(userId: string, role: AdminRole): Promise<AdminUserSummary> {
    return this.patch(`/users/${userId}/role`, { role })
  }

  updateStatus(userId: string, status: AdminStatus): Promise<AdminUserSummary> {
    return this.patch(`/users/${userId}/status`, { status })
  }

  deleteUser(userId: string): Promise<{ message: string }> {
    return this.delete(`/users/${userId}`)
  }
}

export const adminService = new AdminService()
