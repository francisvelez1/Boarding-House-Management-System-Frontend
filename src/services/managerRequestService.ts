import { BaseService } from './BaseService'

export interface ManagerRoleApplyPayload {
  property_name: string
  location:      string
  address:       string
  room_count:    number
  description?:  string
  documents?:    string[]
}

export interface ManagerRoleRequestItem {
  id:             string
  property_name:  string
  location:       string
  address:        string
  room_count:     number
  status:         'PENDING' | 'APPROVED' | 'REJECTED'
  review_notes?:  string
  created_at:     string
}

export interface ReviewManagerPayload {
  status:       'APPROVED' | 'REJECTED'
  review_notes?: string
}

class ManagerRequestService extends BaseService {
  constructor() { super('/manager-requests') }

  apply(payload: ManagerRoleApplyPayload): Promise<{ message: string; id: string }> {
    return this.post('/apply', payload)
  }

  getMyRequests(): Promise<{ requests: ManagerRoleRequestItem[] }> {
    return this.get('/my')
  }

  // Admin
  listAll(params?: { status?: string; skip?: number; limit?: number }): Promise<{
    total: number
    skip: number
    limit: number
    requests: ManagerRoleRequestItem[]
  }> {
    return this.get('/admin/all', { params })
  }

  review(requestId: string, payload: ReviewManagerPayload): Promise<{ message: string; request_id: string; status: string }> {
    return this.patch(`/admin/${requestId}/review`, payload)
  }

  deleteRequest(requestId: string): Promise<{ message: string }> {
    return this.delete(`/admin/${requestId}`)
  }
}

export const managerRequestService = new ManagerRequestService()
