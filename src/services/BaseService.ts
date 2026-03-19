// ============================================================
//  ResidEase — BaseService (Abstract OOP Base Class)
//  All services extend this. Handles Axios, JWT, and errors.
// ============================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'

export abstract class BaseService {
  protected readonly http: AxiosInstance

  constructor(basePath = '') {
    this.http = axios.create({
      baseURL: `/api${basePath}`,
      headers: { 'Content-Type': 'application/json' },
    })

    // Attach JWT on every request
    this.http.interceptors.request.use((config) => {
      const auth = useAuthStore()
      if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
      return config
    })

    // Auto-logout on 401
    this.http.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) useAuthStore().logout()
        return Promise.reject(this.normalizeError(err))
      },
    )
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.get<T>(url, config); return res.data
  }
  protected async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.post<T>(url, body, config); return res.data
  }
  protected async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.put<T>(url, body, config); return res.data
  }
  protected async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.patch<T>(url, body, config); return res.data
  }
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.http.delete<T>(url, config); return res.data
  }

  private normalizeError(err: any): Error {
    const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'An unexpected error occurred.'
    return new Error(msg)
  }
}
