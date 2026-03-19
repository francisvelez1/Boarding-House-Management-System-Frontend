// ============================================================
//  ResidEase — Domain Models
//  const objects replace enums (erasableSyntaxOnly compatible)
// ============================================================

// ── Const Objects (replacing enums) ─────────────────────────

export const Role = {
  ADMIN:  'ADMIN',
  STAFF:  'STAFF',
  TENANT: 'TENANT',
} as const
export type Role = typeof Role[keyof typeof Role]

export const RoomStatus = {
  AVAILABLE:   'AVAILABLE',
  OCCUPIED:    'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
} as const
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus]

export const TenantStatus = {
  ACTIVE:    'ACTIVE',
  MOVED_OUT: 'MOVED_OUT',
  PENDING:   'PENDING',
} as const
export type TenantStatus = typeof TenantStatus[keyof typeof TenantStatus]

export const PaymentMethod = {
  CASH:          'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  GCASH:         'GCASH',
} as const
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod]

export const MaintenanceStatus = {
  PENDING:     'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
} as const
export type MaintenanceStatus = typeof MaintenanceStatus[keyof typeof MaintenanceStatus]

export const ButtonVariant = {
  PRIMARY:   'primary',
  SECONDARY: 'secondary',
  DANGER:    'danger',
  GHOST:     'ghost',
} as const
export type ButtonVariant = typeof ButtonVariant[keyof typeof ButtonVariant]

export const BadgeColor = {
  GREEN:  'green',
  YELLOW: 'yellow',
  RED:    'red',
  BLUE:   'blue',
  GRAY:   'gray',
} as const
export type BadgeColor = typeof BadgeColor[keyof typeof BadgeColor]

export const ComponentSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const
export type ComponentSize = typeof ComponentSize[keyof typeof ComponentSize]

// ── Interfaces ───────────────────────────────────────────────

export interface IUser         { id: number; username: string; email: string; role: Role; isActive: boolean }
export interface IRoom         { id: number; roomNumber: string; floor: number; status: RoomStatus; monthlyRate: number; capacity: number }
export interface ITenant       { id: number; firstName: string; lastName: string; email: string; phoneNumber: string; status: TenantStatus; roomId?: number }
export interface ILease        { id: number; tenantId: number; roomId: number; startDate: string; endDate: string; rentAmount: number; isActive: boolean }
export interface IPayment      { id: number; tenantId: number; leaseId: number; amount: number; method: PaymentMethod; paymentDate: string; receiptNumber: string }
export interface IMaintenance  { id: number; roomId: number; title: string; description: string; status: MaintenanceStatus; reportedAt: string; resolvedAt?: string }
export interface IFormField    { modelValue: string; label: string; error?: string; required?: boolean; placeholder?: string }
export interface IBaseComponent { size?: ComponentSize; disabled?: boolean; loading?: boolean }

// ── Auth Types ───────────────────────────────────────────────

export interface LoginCredentials {
  username_or_email: string
  password:          string
}
export interface LoginResponse {
  username:      string
  access_token:  string
  refresh_token: string
}
export interface RegisterPayload {
  username:    string
  firstName:   string
  lastName:    string
  email:       string
  phoneNumber: string
  password:    string
}

// ── Value Objects ────────────────────────────────────────────

export class Money {
  readonly amount:   number
  readonly currency: string

  constructor(amount: number, currency = 'PHP') {
    this.amount   = amount
    this.currency = currency
  }

  format(): string {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: this.currency }).format(this.amount)
  }
  add(other: Money): Money             { return new Money(this.amount + other.amount, this.currency) }
  isGreaterThan(other: Money): boolean { return this.amount > other.amount }
}

export class DateRange {
  readonly start: Date
  readonly end:   Date

  constructor(start: Date, end: Date) {
    if (start > end) throw new Error('Start date must be before end date.')
    this.start = start
    this.end   = end
  }

  get durationDays(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / 86_400_000)
  }
  isExpired(): boolean { return this.end < new Date() }
  isExpiringSoon(days = 30): boolean {
    const t = new Date(); t.setDate(t.getDate() + days)
    return !this.isExpired() && this.end <= t
  }
  format(): string {
    const fmt = (d: Date) => new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
    return `${fmt(this.start)} – ${fmt(this.end)}`
  }
}

// ── Domain Classes ───────────────────────────────────────────

export class User implements IUser {
  readonly id: number
  username:    string
  email:       string
  role:        Role
  isActive:    boolean

  constructor(id: number, username: string, email: string, role: Role, isActive: boolean) {
    this.id       = id
    this.username = username
    this.email    = email
    this.role     = role
    this.isActive = isActive
  }

  get fullLabel() { return `${this.username} (${this.role})` }
  isAdmin()       { return this.role === Role.ADMIN  }
  isStaff()       { return this.role === Role.STAFF  }
  isTenant()      { return this.role === Role.TENANT }
  getInitials()   { return this.username.slice(0, 2).toUpperCase() }
}

export class Room implements IRoom {
  readonly id: number
  roomNumber:  string
  floor:       number
  status:      RoomStatus
  monthlyRate: number
  capacity:    number

  constructor(id: number, roomNumber: string, floor: number, status: RoomStatus, monthlyRate: number, capacity: number) {
    this.id          = id
    this.roomNumber  = roomNumber
    this.floor       = floor
    this.status      = status
    this.monthlyRate = monthlyRate
    this.capacity    = capacity
  }

  get rent()      { return new Money(this.monthlyRate) }
  isAvailable()   { return this.status === RoomStatus.AVAILABLE   }
  isOccupied()    { return this.status === RoomStatus.OCCUPIED    }
  isMaintenance() { return this.status === RoomStatus.MAINTENANCE }
  getStatusColor(): BadgeColor {
    return {
      [RoomStatus.AVAILABLE]:   BadgeColor.GREEN,
      [RoomStatus.OCCUPIED]:    BadgeColor.BLUE,
      [RoomStatus.MAINTENANCE]: BadgeColor.YELLOW,
    }[this.status]
  }
}

export class Tenant implements ITenant {
  readonly id: number
  firstName:   string
  lastName:    string
  email:       string
  phoneNumber: string
  status:      TenantStatus
  roomId?:     number

  constructor(id: number, firstName: string, lastName: string, email: string, phoneNumber: string, status: TenantStatus, roomId?: number) {
    this.id          = id
    this.firstName   = firstName
    this.lastName    = lastName
    this.email       = email
    this.phoneNumber = phoneNumber
    this.status      = status
    this.roomId      = roomId
  }

  get fullName()  { return `${this.firstName} ${this.lastName}` }
  getInitials()   { return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase() }
  isActive()      { return this.status === TenantStatus.ACTIVE    }
  isMovedOut()    { return this.status === TenantStatus.MOVED_OUT }
  getStatusColor(): BadgeColor {
    return {
      [TenantStatus.ACTIVE]:    BadgeColor.GREEN,
      [TenantStatus.MOVED_OUT]: BadgeColor.GRAY,
      [TenantStatus.PENDING]:   BadgeColor.YELLOW,
    }[this.status]
  }
}

export class Lease implements ILease {
  readonly id:        number
  readonly dateRange: DateRange
  tenantId:           number
  roomId:             number
  startDate:          string
  endDate:            string
  rentAmount:         number
  isActive:           boolean

  constructor(id: number, tenantId: number, roomId: number, startDate: string, endDate: string, rentAmount: number, isActive: boolean) {
    this.id         = id
    this.tenantId   = tenantId
    this.roomId     = roomId
    this.startDate  = startDate
    this.endDate    = endDate
    this.rentAmount = rentAmount
    this.isActive   = isActive
    this.dateRange  = new DateRange(new Date(startDate), new Date(endDate))
  }

  get rent()          { return new Money(this.rentAmount)      }
  isExpired()         { return this.dateRange.isExpired()      }
  isExpiringSoon()    { return this.dateRange.isExpiringSoon() }
  get durationLabel() { return `${this.dateRange.durationDays} days` }
}

export class Payment implements IPayment {
  readonly id:   number
  tenantId:      number
  leaseId:       number
  amount:        number
  method:        PaymentMethod
  paymentDate:   string
  receiptNumber: string

  constructor(id: number, tenantId: number, leaseId: number, amount: number, method: PaymentMethod, paymentDate: string, receiptNumber: string) {
    this.id            = id
    this.tenantId      = tenantId
    this.leaseId       = leaseId
    this.amount        = amount
    this.method        = method
    this.paymentDate   = paymentDate
    this.receiptNumber = receiptNumber
  }

  get money()        { return new Money(this.amount) }
  getFormattedDate() {
    return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(this.paymentDate))
  }
}

export class MaintenanceRequest implements IMaintenance {
  readonly id: number
  roomId:      number
  title:       string
  description: string
  status:      MaintenanceStatus
  reportedAt:  string
  resolvedAt?: string

  constructor(id: number, roomId: number, title: string, description: string, status: MaintenanceStatus, reportedAt: string, resolvedAt?: string) {
    this.id          = id
    this.roomId      = roomId
    this.title       = title
    this.description = description
    this.status      = status
    this.reportedAt  = reportedAt
    this.resolvedAt  = resolvedAt
  }

  isPending()    { return this.status === MaintenanceStatus.PENDING     }
  isInProgress() { return this.status === MaintenanceStatus.IN_PROGRESS }
  isCompleted()  { return this.status === MaintenanceStatus.COMPLETED   }
  getStatusColor(): BadgeColor {
    return {
      [MaintenanceStatus.PENDING]:     BadgeColor.YELLOW,
      [MaintenanceStatus.IN_PROGRESS]: BadgeColor.BLUE,
      [MaintenanceStatus.COMPLETED]:   BadgeColor.GREEN,
    }[this.status]
  }
}