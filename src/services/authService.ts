import axios, { type AxiosInstance } from 'axios'

export interface LoginCredentials {
  email:    string
  password: string
}

export interface RegisterPayload {
  firstName:   string
  lastName:    string
  email:       string
  phoneNumber?: string
  password:    string
}

export interface LoginResponse {
  message:       string
  username:      string
  access_token:  string
  refresh_token: string
  token_type:    string
}

const baseURL: string = import.meta.env.VITE_API_URL

export class AuthService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL,
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { data } = await this.api.post<LoginResponse>('/auth/login', {
        username: credentials.email,   // backend expects "username"
        password: credentials.password,
      })
      return data
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message)
      throw error
    }
  }

  async register(payload: RegisterPayload) {
    try {
      const { data } = await this.api.post('/auth/register', {
        username:   payload.email,
        email:      payload.email,
        password:   payload.password,
        first_name: payload.firstName,
        last_name:  payload.lastName,
        phone:      payload.phoneNumber,
      })
      return data
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message)
      throw error
    }
  }
}

export const authService = new AuthService()