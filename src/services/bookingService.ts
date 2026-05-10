import { BaseService } from './BaseService'

export interface BookingApplyPayload {
  room_id:              string
  full_name:            string
  last_name?:           string
  email:                string
  phone:                string
  address:              string
  city?:                string
  province?:            string
  desired_move_in_date?: string
  message?:             string
  id_document?:         string
  date_of_birth?:       string
  gender?:              string
  civil_status?:        string
  nationality?:         string
  occupation?:          string
  employer?:            string
  monthly_income?:      number
  emergency_contact_name?:         string
  emergency_contact_phone?:        string
  emergency_contact_relationship?: string
}

export interface BookingItem {
  id:                  string
  user_id:             string
  room_id:             string
  room_number?:        string
  monthly_rent?:       number
  full_name:           string
  last_name?:          string
  email:               string
  phone:               string
  address:             string
  city?:               string
  province?:           string
  desired_move_in_date?: string
  message?:            string
  date_of_birth?:      string
  gender?:             string
  civil_status?:       string
  nationality?:        string
  occupation?:         string
  employer?:           string
  monthly_income?:     number
  emergency_contact_name?:         string
  emergency_contact_phone?:        string
  emergency_contact_relationship?: string
  id_document?:        string
  status:              'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  review_notes?:       string
  reviewed_at?:        string
  created_at:          string
  updated_at?:         string
}

export interface ReviewBookingPayload {
  status:       'APPROVED' | 'REJECTED' | 'CONFIRMED'
  review_notes?: string
}

class BookingService extends BaseService {
  constructor() { super('/bookings') }

  apply(payload: BookingApplyPayload): Promise<{ message: string; id: string }> {
    return this.post('/apply', payload)
  }

  getMyBookings(): Promise<{ bookings: BookingItem[] }> {
    return this.get('/my')
  }

  // Manager / Admin
  listAll(params?: { status?: string; skip?: number; limit?: number }): Promise<{
    total: number
    skip: number
    limit: number
    bookings: BookingItem[]
  }> {
    return this.get('/manager/all', { params })
  }

  review(bookingId: string, payload: ReviewBookingPayload): Promise<{ message: string; booking_id: string; status: string }> {
    return this.patch(`/manager/${bookingId}/review`, payload)
  }

  deleteBooking(bookingId: string): Promise<{ message: string }> {
    return this.delete(`/manager/${bookingId}`)
  }
}

export const bookingService = new BookingService()
