import { BaseService } from './BaseService'

export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'APPLIANCE' | 'PEST' | 'CLEANING' | 'SECURITY' | 'OTHER'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type MaintenanceStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'REJECTED'

export interface MaintenanceItem {
  id: string
  room_id: string
  title: string
  description: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  status: MaintenanceStatus
  photos: string[]
  created_at: string
  updated_at: string
}

export interface SubmitMaintenancePayload {
  room_id?: string        // ← make optional
  title: string
  description: string
  category?: MaintenanceCategory
  priority?: MaintenancePriority
  photos?: string[]
}

class MaintenanceService extends BaseService {
  constructor() { super('/maintenance') }

  submit(payload: SubmitMaintenancePayload): Promise<{ message: string; id: string }> {
    return this.post('/submit', payload)
  }

  getMyRequests(): Promise<{ requests: MaintenanceItem[] }> {
    return this.get('/my')
  }
}

export const maintenanceService = new MaintenanceService()
