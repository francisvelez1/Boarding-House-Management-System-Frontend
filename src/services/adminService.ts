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

export interface RolePermission {
  role: string
  display_name: string
  level: number
  permissions: string[]
}

export interface RolesPermissionsResponse {
  roles: RolePermission[]
}

export interface AuditLog {
  id: string
  timestamp: string
  action: string
  actor: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
}

export interface AuditLogsResponse {
  total: number
  page: number
  limit: number
  logs: AuditLog[]
}

export interface SystemHealthResponse {
  status: string
  timestamp: string
  uptime_seconds: number
  database: { connected: boolean }
  stats: { users: number }
}

export interface SystemSettingsData {
  site_name: string
  maintenance_mode: boolean
  allow_registration: boolean
  default_user_role: string
  session_timeout_minutes: number
  support_email: string
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

  getRolesPermissions(): Promise<RolesPermissionsResponse> {
    return this.get('/roles-permissions')
  }

  getAuditLogs(params: { page?: number; limit?: number; action?: string; actor?: string; target_type?: string } = {}): Promise<AuditLogsResponse> {
    return this.get('/audit-logs', { params })
  }

  getSystemHealth(): Promise<SystemHealthResponse> {
    return this.get('/system-health')
  }

  getSystemSettings(): Promise<SystemSettingsData> {
    return this.get('/system-settings')
  }

  updateSystemSettings(data: Partial<SystemSettingsData>): Promise<{ message: string; settings: SystemSettingsData }> {
    return this.patch('/system-settings', data)
  }
}

export const adminService = new AdminService()
