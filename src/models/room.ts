// ================================================================
// CONST MAPS — mirrors backend room.py
// (enums replaced with `as const` objects for erasableSyntaxOnly)
// ================================================================

export const RoomStatus = {
  VACANT:      'VACANT',
  OCCUPIED:    'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  RESERVED:    'RESERVED',
} as const
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus]

export const RoomType = {
  SINGLE:    'SINGLE',
  DOUBLE:    'DOUBLE',
  STUDIO:    'STUDIO',
  DORMITORY: 'DORMITORY',
  SUITE:     'SUITE',
} as const
export type RoomType = typeof RoomType[keyof typeof RoomType]

export const FloorLevel = {
  GROUND: 'GROUND',
  SECOND: 'SECOND',
  THIRD:  'THIRD',
  FOURTH: 'FOURTH',
  FIFTH:  'FIFTH',
} as const
export type FloorLevel = typeof FloorLevel[keyof typeof FloorLevel]

// ================================================================
// EMBEDDED SUB-DOCUMENTS
// ================================================================

export interface RoomAmenity {
  name:        string
  description?: string
  is_working:  boolean
}

export interface RoomDimension {
  length_sqm?: number
  width_sqm?:  number
}

export interface ManagerInfo {
  username:  string
  full_name: string
  email:     string
  phone?:    string
}

// ================================================================
// MAIN INTERFACE
// ================================================================

export interface Room {
  id:              string

  // Identity
  room_number:     string
  floor_level?:    FloorLevel
  room_type:       RoomType
  description?:    string

  // Property Info
  property_name?: string
  location?:      string
  address?:       string

  // Capacity
  max_occupants:     number
  current_occupants: number

  // Status
  status: RoomStatus

  // Financial
  monthly_rate:       number
  deposit_multiplier: number
  advance_multiplier: number

  // Physical
  dimension?: RoomDimension
  amenities:  RoomAmenity[]

  // Media
  images: string[]

  // Maintenance
  last_maintenance_date?: string
  maintenance_notes?:     string

  // Audit
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string

  // Manager (public listings)
  manager_info?: ManagerInfo
}

// ================================================================
// DISPLAY HELPERS
// ================================================================

export const FLOOR_LABEL: Record<FloorLevel, string> = {
  [FloorLevel.GROUND]: 'Ground floor',
  [FloorLevel.SECOND]: '2nd floor',
  [FloorLevel.THIRD]:  '3rd floor',
  [FloorLevel.FOURTH]: '4th floor',
  [FloorLevel.FIFTH]:  '5th floor',
}

export const TYPE_LABEL: Record<RoomType, string> = {
  [RoomType.SINGLE]:    'Single',
  [RoomType.DOUBLE]:    'Double',
  [RoomType.STUDIO]:    'Studio',
  [RoomType.DORMITORY]: 'Dormitory',
  [RoomType.SUITE]:     'Suite',
}

export const STATUS_LABEL: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]:      'Available',
  [RoomStatus.OCCUPIED]:    'Occupied',
  [RoomStatus.MAINTENANCE]: 'Maintenance',
  [RoomStatus.RESERVED]:    'Reserved',
}

export const STATUS_COLOR: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]:      '#22c55e',
  [RoomStatus.OCCUPIED]:    '#ef4444',
  [RoomStatus.MAINTENANCE]: '#8b5cf6',
  [RoomStatus.RESERVED]:    '#f59e0b',
}

export const CARD_BG: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]:      '#dcfce7',
  [RoomStatus.OCCUPIED]:    '#fee2e2',
  [RoomStatus.MAINTENANCE]: '#ede9fe',
  [RoomStatus.RESERVED]:    '#fef9c3',
}

export const ICON_COLOR: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]:      '#86efac',
  [RoomStatus.OCCUPIED]:    '#fca5a5',
  [RoomStatus.MAINTENANCE]: '#c4b5fd',
  [RoomStatus.RESERVED]:    '#fde047',
}

// ================================================================
// COMPUTED HELPERS (mirrors backend @property)
// ================================================================

export const requiredDeposit = (r: Room) =>
  +(r.monthly_rate * r.deposit_multiplier).toFixed(2)

export const requiredAdvance = (r: Room) =>
  +(r.monthly_rate * r.advance_multiplier).toFixed(2)

export const moveInTotal = (r: Room) =>
  +(requiredDeposit(r) + requiredAdvance(r) + r.monthly_rate).toFixed(2)

export const isAvailable = (r: Room) => r.status === RoomStatus.VACANT

export const isFull = (r: Room) => r.current_occupants >= r.max_occupants

export const formatPrice = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0 })