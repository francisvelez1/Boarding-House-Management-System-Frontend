import { BaseService } from './BaseService'

// ── Enums ──────────────────────────────────────────────────────────────────

export type MaintenanceCategory =
  | 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'APPLIANCE'
  | 'PEST' | 'CLEANING' | 'SECURITY' | 'OTHER'

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type MaintenanceStatus =
  | 'SUBMITTED'    // tenant submitted, awaiting manager review
  | 'ASSIGNED'     // manager accepted & assigned (was: ACCEPTED)
  | 'IN_PROGRESS'  // work has started
  | 'COMPLETED'    // work done, awaiting tenant confirmation
  | 'CLOSED'       // tenant confirmed fix
  | 'REJECTED'     // manager rejected the request

// ── Interfaces ─────────────────────────────────────────────────────────────

/** What a tenant sees for their own requests */
export interface MaintenanceItem {
  id:          string
  room_id:     string | null
  title:       string
  description: string
  category:    MaintenanceCategory
  priority:    MaintenancePriority
  status:      MaintenanceStatus
  photos:      string[]
  resolution:  string | null
  created_at:  string
  updated_at:  string
}

/** Extended view for managers / admins */
export interface ManagerMaintenanceItem extends MaintenanceItem {
  tenant_id:        string
  assigned_to:      string | null
  rejection_reason: string | null
}

// ── Payloads ───────────────────────────────────────────────────────────────

export interface SubmitMaintenancePayload {
  room_id?:     string
  title:        string
  description:  string
  category?:    MaintenanceCategory
  priority?:    MaintenancePriority
  photos?:      string[]
}

export interface AcceptMaintenancePayload {
  assigned_to?: string   // omit to assign to the current manager
}

export interface CompleteMaintenancePayload {
  resolution: string
}

export interface RejectMaintenancePayload {
  rejection_reason: string
}

// ── Service ────────────────────────────────────────────────────────────────

class MaintenanceService extends BaseService {
  constructor() { super('/maintenance') }

  // ── Tenant ──────────────────────────────────────────────────────────────

  /** Submit a new maintenance request */
  submit(payload: SubmitMaintenancePayload): Promise<{ message: string; id: string }> {
    return this.post('/submit', payload)
  }

  /** Get the current tenant's maintenance requests */
  getMyRequests(): Promise<{ requests: MaintenanceItem[] }> {
    return this.get('/my')
  }

  /** Tenant confirms fix → closes the ticket */
  closeRequest(requestId: string): Promise<{ message: string; request_id: string; status: MaintenanceStatus }> {
    return this.patch(`/close/${requestId}`, {})
  }

  // ── Manager / Admin ─────────────────────────────────────────────────────

  /** List all requests with optional status filter & pagination */
  getAllRequests(params?: {
    status?: MaintenanceStatus
    skip?:   number
    limit?:  number
  }): Promise<{ total: number; skip: number; limit: number; requests: ManagerMaintenanceItem[] }> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.skip   != null) query.set('skip',  String(params.skip))
    if (params?.limit  != null) query.set('limit', String(params.limit))
    const qs = query.toString()
    return this.get(`/manager/all${qs ? `?${qs}` : ''}`)
  }

  /** Accept a request → moves to ASSIGNED */
  acceptRequest(
    requestId: string,
    payload:   AcceptMaintenancePayload = {},
  ): Promise<{ message: string; request_id: string; status: MaintenanceStatus; assigned_to: string }> {
    return this.patch(`/manager/${requestId}/accept`, payload)
  }

  /** Start work → moves to IN_PROGRESS */
  startRequest(
    requestId: string,
  ): Promise<{ message: string; request_id: string; status: MaintenanceStatus }> {
    return this.patch(`/manager/${requestId}/start`, {})
  }

  /** Mark as done → moves to COMPLETED */
  completeRequest(
    requestId: string,
    payload:   CompleteMaintenancePayload,
  ): Promise<{ message: string; request_id: string; status: MaintenanceStatus; resolution: string }> {
    return this.patch(`/manager/${requestId}/complete`, payload)
  }

  /** Reject a request → moves to REJECTED */
  rejectRequest(
    requestId: string,
    payload:   RejectMaintenancePayload,
  ): Promise<{ message: string; request_id: string; status: MaintenanceStatus; rejection_reason: string }> {
    return this.patch(`/manager/${requestId}/reject`, payload)
  }

  /** Manager force-closes a completed request */
  forceCloseRequest(
    requestId: string,
  ): Promise<{ message: string; request_id: string; status: MaintenanceStatus }> {
    return this.patch(`/manager/${requestId}/close`, {})
  }

  /** Delete a request */
  deleteRequest(
    requestId: string,
  ): Promise<{ message: string }> {
    return this.delete(`/manager/${requestId}`)
  }
}

export const maintenanceService = new MaintenanceService()