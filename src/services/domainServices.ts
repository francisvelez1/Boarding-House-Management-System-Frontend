// ============================================================
//  ResidEase — Domain Services
//  Each class maps 1-to-1 with the FastAPI controller endpoints.
//  All auth (JWT injection, 401 handling) is handled by BaseService.
// ============================================================

import { BaseService } from './BaseService'

// ── Shared pagination params ─────────────────────────────────
interface PaginationParams {
  skip?:  number   // default 0
  limit?: number   // default 20, max 100
}

// ── Response wrapper (mirrors ApiResponse[T] from backend) ───
export interface ApiResponse<T> {
  data:       T
  message:    string
  status_code: number
}

// ================================================================
//  ROOM TYPES  (mirrors room.py models)
// ================================================================

export type RoomStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
export type RoomType   = 'SINGLE' | 'DOUBLE' | 'STUDIO' | 'DORMITORY' | 'SUITE'
export type FloorLevel = 'GROUND' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH'

export interface RoomAmenity {
  name:        string
  description?: string
  is_working:  boolean
}

export interface RoomDimension {
  length_sqm?: number
  width_sqm?:  number
}

export interface RoomResponse {
  id:                   string
  room_number:          string
  floor_level?:         FloorLevel
  room_type:            RoomType
  description?:         string
  max_occupants:        number
  current_occupants:    number
  status:               RoomStatus
  monthly_rate:         number
  deposit_multiplier:   number
  advance_multiplier:   number
  required_deposit:     number
  required_advance:     number
  move_in_total:        number
  dimension?:           RoomDimension
  amenities:            RoomAmenity[]
  images:               string[]
  last_maintenance_date?: string
  maintenance_notes?:   string
  created_at:           string
  updated_at:           string
  created_by?:          string
  updated_by?:          string
}

export interface RoomCreateRequest {
  room_number:         string
  floor_level?:        FloorLevel
  room_type?:          RoomType
  description?:        string
  property_name?:      string
  location?:           string
  address?:            string
  max_occupants?:      number
  monthly_rate:        number
  deposit_multiplier?: number
  advance_multiplier?: number
  dimension?:          RoomDimension
  amenities?:          RoomAmenity[]
  images?:             string[]
}

export interface RoomUpdateRequest {
  floor_level?:        FloorLevel
  room_type?:          RoomType
  description?:        string
  property_name?:      string
  location?:           string
  address?:            string
  max_occupants?:      number
  monthly_rate?:       number
  deposit_multiplier?: number
  advance_multiplier?: number
  dimension?:          RoomDimension
  amenities?:          RoomAmenity[]
  maintenance_notes?:  string
}

export interface RoomStats {
  total:       number
  vacant:      number
  occupied:    number
  maintenance: number
  reserved:    number
  occupancy_rate: number   // percentage
}

// ================================================================
//  TENANT TYPES  (mirrors tenant.py models)
// ================================================================

export type TenantStatus    = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT'
export type IDType          = 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'SSS' | 'PHILHEALTH' | 'PAGIBIG' | 'POSTAL_ID' | 'VOTERS_ID' | 'OTHER'
export type EmergencyRelation = 'PARENT' | 'SPOUSE' | 'SIBLING' | 'RELATIVE' | 'FRIEND' | 'GUARDIAN' | 'OTHER'
export type CivilStatus     = 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'DIVORCED' | 'OTHER'
export type Gender          = 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY'

export interface EmergencyContact {
  full_name:    string
  phone:        string
  relationship: EmergencyRelation
  email?:       string
  address?:     string
}

export interface GovernmentID {
  id_type:     IDType
  id_number:   string
  issued_date?: string
  expiry_date?: string
  verified:    boolean
  verified_by?: string
  verified_at?: string
}

export interface Address {
  street?:   string
  barangay?: string
  city?:     string
  province?: string
  zip_code?: string
  country:   string
}

export interface TenantResponse {
  id:                 string
  user_id?:           string
  first_name:         string
  last_name:          string
  middle_name?:       string
  full_name:          string
  date_of_birth?:     string
  gender?:            Gender
  civil_status?:      CivilStatus
  nationality:        string
  phone:              string
  email:              string
  profile_picture?:   string
  home_address?:      Address
  occupation?:        string
  employer?:          string
  monthly_income?:    number
  government_id?:     GovernmentID
  emergency_contact?: EmergencyContact
  room_id?:           string
  move_in_date?:      string
  move_out_date?:     string
  status:             TenantStatus
  outstanding_balance: number
  total_paid:         number
  deposit_paid:       boolean
  deposit_amount?:    number
  deposit_date?:      string
  notes?:             string
  created_at:         string
  updated_at:         string
  created_by?:        string
  updated_by?:        string
}

export interface TenantCreateRequest {
  user_id?:           string
  first_name:         string
  last_name:          string
  middle_name?:       string
  date_of_birth?:     string
  gender?:            Gender
  civil_status?:      CivilStatus
  nationality?:       string
  phone:              string
  email:              string
  occupation?:        string
  employer?:          string
  monthly_income?:    number
  home_address?:      Address
  government_id?:     GovernmentID
  emergency_contact?: EmergencyContact
  notes?:             string
}

export interface TenantUpdateRequest {
  first_name?:        string
  last_name?:         string
  middle_name?:       string
  date_of_birth?:     string
  gender?:            Gender
  civil_status?:      CivilStatus
  nationality?:       string
  phone?:             string
  email?:             string
  occupation?:        string
  employer?:          string
  monthly_income?:    number
  home_address?:      Address
  government_id?:     GovernmentID
  emergency_contact?: EmergencyContact
  notes?:             string
}

export interface AssignRoomRequest {
  room_id:      string
  move_in_date: string   // ISO datetime string
}

export interface DepositPaymentRequest {
  amount:       number
  deposit_date: string   // ISO datetime string
}

export interface TenantStats {
  total:     number
  active:    number
  pending:   number
  inactive:  number
  moved_out: number
}


// ================================================================
//  ROOM SERVICE
//  Prefix: /api/rooms
// ================================================================

class RoomService extends BaseService {
  constructor() { super('/rooms') }

  // ── POST /api/rooms ──────────────────────────────────────────
  // ADMIN, MANAGER
  create(request: RoomCreateRequest): Promise<ApiResponse<RoomResponse>> {
    return this.post('/', request)
  }

  // ── GET /api/rooms ───────────────────────────────────────────
  // ADMIN, MANAGER, STAFF
  getAll(params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get('/', { params })
  }

  // ── GET /api/rooms/search?q=... ──────────────────────────────
  // ADMIN, MANAGER, STAFF
  search(q: string, params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get('/search', { params: { q, ...params } })
  }

  // ── GET /api/rooms/stats ─────────────────────────────────────
  // ADMIN, MANAGER  — used by dashboard
  getStats(): Promise<ApiResponse<RoomStats>> {
    return this.get('/stats')
  }

  // ── GET /api/rooms/vacant ────────────────────────────────────
  // ADMIN, MANAGER, STAFF
  getVacant(params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get('/vacant', { params })
  }

  // ── GET /api/rooms/maintenance ───────────────────────────────
  // ADMIN, MANAGER, STAFF
  getUnderMaintenance(params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get('/maintenance', { params })
  }

  // ── GET /api/rooms/status/{room_status} ──────────────────────
  // ADMIN, MANAGER, STAFF
  getByStatus(status: RoomStatus, params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get(`/status/${status}`, { params })
  }

  // ── GET /api/rooms/type/{room_type} ──────────────────────────
  // ADMIN, MANAGER, STAFF, TENANT
  getByType(type: RoomType, params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get(`/type/${type}`, { params })
  }

  // ── GET /api/rooms/rate-range?min_rate=&max_rate= ────────────
  // ADMIN, MANAGER, STAFF, TENANT
  getByRateRange(minRate: number, maxRate: number, params: PaginationParams = {}): Promise<ApiResponse<RoomResponse[]>> {
    return this.get('/rate-range', { params: { min_rate: minRate, max_rate: maxRate, ...params } })
  }

  // ── GET /api/rooms/number/{room_number} ──────────────────────
  // ADMIN, MANAGER, STAFF
  getByNumber(roomNumber: string): Promise<ApiResponse<RoomResponse>> {
    return this.get(`/number/${roomNumber}`)
  }

  // ── GET /api/rooms/{room_id} ─────────────────────────────────
  // ADMIN, MANAGER, STAFF
  getById(roomId: string): Promise<ApiResponse<RoomResponse>> {
    return this.get(`/${roomId}`)
  }

  // ── PATCH /api/rooms/{room_id} ───────────────────────────────
  // ADMIN, MANAGER
  update(roomId: string, request: RoomUpdateRequest): Promise<ApiResponse<RoomResponse>> {
    return this.patch(`/${roomId}`, request)
  }

  // ── PATCH /api/rooms/{room_id}/status ────────────────────────
  // ADMIN, MANAGER
  updateStatus(roomId: string, status: RoomStatus): Promise<ApiResponse<RoomResponse>> {
    return this.patch(`/${roomId}/status`, { status })
  }

  // ── PATCH /api/rooms/{room_id}/maintenance/start ─────────────
  // ADMIN, MANAGER, MAINTENANCE
  startMaintenance(roomId: string, maintenanceNotes: string): Promise<ApiResponse<RoomResponse>> {
    return this.patch(`/${roomId}/maintenance/start`, { maintenance_notes: maintenanceNotes })
  }

  // ── PATCH /api/rooms/{room_id}/maintenance/complete ──────────
  // ADMIN, MANAGER, MAINTENANCE
  completeMaintenance(roomId: string): Promise<ApiResponse<RoomResponse>> {
    return this.patch(`/${roomId}/maintenance/complete`)
  }

  // ── POST /api/rooms/{room_id}/images ─────────────────────────
  // ADMIN, MANAGER
  addImage(roomId: string, imageUrl: string): Promise<ApiResponse<RoomResponse>> {
    return this.post(`/${roomId}/images`, { image_url: imageUrl })
  }

  // ── DELETE /api/rooms/{room_id}/images ───────────────────────
  // ADMIN, MANAGER
  removeImage(roomId: string, imageUrl: string): Promise<ApiResponse<RoomResponse>> {
    return this.delete(`/${roomId}/images`, { data: { image_url: imageUrl } })
  }

  // ── PATCH /api/rooms/{room_id}/unassign ─────────────────────
  // ADMIN, MANAGER — unassign tenant and free room
  unassignRoom(roomId: string): Promise<ApiResponse<{ message: string }>> {
    return this.patch(`/${roomId}/unassign`)
  }

  // ── DELETE /api/rooms/{room_id} ──────────────────────────────
  // ADMIN only
  deleteRoom(roomId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/${roomId}`)
  }
}


// ================================================================
//  TENANT SERVICE
//  Prefix: /api/tenants
// ================================================================

class TenantService extends BaseService {
  constructor() { super('/tenants') }

  // ── POST /api/tenants ────────────────────────────────────────
  // ADMIN, MANAGER
  register(request: TenantCreateRequest): Promise<ApiResponse<TenantResponse>> {
    return this.post('/', request)
  }

  // ── GET /api/tenants ─────────────────────────────────────────
  // ADMIN, MANAGER, STAFF
  getAll(params: PaginationParams = {}): Promise<ApiResponse<TenantResponse[]>> {
    return this.get('/', { params })
  }

  // ── GET /api/tenants/search?q=... ────────────────────────────
  // ADMIN, MANAGER, STAFF
  search(q: string, params: PaginationParams = {}): Promise<ApiResponse<TenantResponse[]>> {
    return this.get('/search', { params: { q, ...params } })
  }

  // ── GET /api/tenants/stats ───────────────────────────────────
  // ADMIN, MANAGER  — used by dashboard
  getStats(): Promise<ApiResponse<TenantStats>> {
    return this.get('/stats')
  }

  // ── GET /api/tenants/status/{tenant_status} ──────────────────
  // ADMIN, MANAGER, STAFF
  getByStatus(status: TenantStatus, params: PaginationParams = {}): Promise<ApiResponse<TenantResponse[]>> {
    return this.get(`/status/${status}`, { params })
  }

  // ── GET /api/tenants/unverified ──────────────────────────────
  // ADMIN, MANAGER
  getUnverified(params: PaginationParams = {}): Promise<ApiResponse<TenantResponse[]>> {
    return this.get('/unverified', { params })
  }

  // ── GET /api/tenants/outstanding-balance ─────────────────────
  // ADMIN, MANAGER
  getWithOutstandingBalance(params: PaginationParams = {}): Promise<ApiResponse<TenantResponse[]>> {
    return this.get('/outstanding-balance', { params })
  }

  // ── GET /api/tenants/me ──────────────────────────────────────
  // TENANT (own profile)
  getMyProfile(): Promise<ApiResponse<TenantResponse>> {
    return this.get('/me')
  }

  // ── GET /api/tenants/{tenant_id} ─────────────────────────────
  // ADMIN, MANAGER, STAFF
  getById(tenantId: string): Promise<ApiResponse<TenantResponse>> {
    return this.get(`/${tenantId}`)
  }

  // ── PATCH /api/tenants/{tenant_id} ───────────────────────────
  // ADMIN, MANAGER
  update(tenantId: string, request: TenantUpdateRequest): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}`, request)
  }

  // ── PATCH /api/tenants/{tenant_id}/status ────────────────────
  // ADMIN, MANAGER
  updateStatus(tenantId: string, status: TenantStatus): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}/status`, { status })
  }

  // ── PATCH /api/tenants/{tenant_id}/assign-room ───────────────
  // ADMIN, MANAGER
  assignRoom(tenantId: string, request: AssignRoomRequest): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}/assign-room`, request)
  }

  // ── PATCH /api/tenants/{tenant_id}/unassign-room ─────────────
  // ADMIN, MANAGER
  unassignRoom(tenantId: string, moveOutDate: string): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}/unassign-room`, { move_out_date: moveOutDate })
  }

  // ── PATCH /api/tenants/{tenant_id}/verify-id ─────────────────
  // ADMIN, MANAGER
  verifyId(tenantId: string): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}/verify-id`)
  }

  // ── PATCH /api/tenants/{tenant_id}/deposit ───────────────────
  // ADMIN, MANAGER
  recordDeposit(tenantId: string, request: DepositPaymentRequest): Promise<ApiResponse<TenantResponse>> {
    return this.patch(`/${tenantId}/deposit`, request)
  }

  // ── DELETE /api/tenants/{tenant_id} ──────────────────────────
  // ADMIN only
  deleteTenant(tenantId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/${tenantId}`)
  }
}


// ================================================================
//  EXPORTS — use these singletons throughout your Vue components
// ================================================================

export const roomService   = new RoomService()
export const tenantService = new TenantService()
