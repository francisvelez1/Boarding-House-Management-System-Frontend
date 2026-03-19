// ============================================================
//  ResidEase — Auth Store  (Pinia + OOP)
//  Session value object handles all localStorage logic.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { User, Role } from '../models'

// ── Session Value Object ─────────────────────────────────────
class Session {
  readonly accessToken:  string
  readonly refreshToken: string
  readonly user:         User

  constructor(accessToken: string, refreshToken: string, user: User) {
    this.accessToken  = accessToken
    this.refreshToken = refreshToken
    this.user         = user
  }

  save(): void {
    localStorage.setItem('access_token',  this.accessToken)
    localStorage.setItem('refresh_token', this.refreshToken)
    localStorage.setItem('user', JSON.stringify({
      id: this.user.id, username: this.user.username,
      email: this.user.email, role: this.user.role, isActive: this.user.isActive,
    }))
  }

  static clear(): void {
    ['access_token', 'refresh_token', 'user'].forEach(k => localStorage.removeItem(k))
  }

  static restore(): Session | null {
    const at  = localStorage.getItem('access_token')
    const rt  = localStorage.getItem('refresh_token')
    const raw = localStorage.getItem('user')
    if (!at || !raw) return null
    try {
      const u    = JSON.parse(raw)
      const user = new User(u.id ?? 0, u.username, u.email ?? '', u.role ?? Role.TENANT, u.isActive ?? true)
      return new Session(at, rt ?? '', user)
    } catch { return null }
  }
}

// ── Pinia Store ──────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(Session.restore())

  const isAuthenticated = computed(() => session.value !== null)
  const user            = computed(() => session.value?.user ?? null)
  const token           = computed(() => session.value?.accessToken  ?? null)
  const refreshToken    = computed(() => session.value?.refreshToken ?? null)
  const isAdmin         = computed(() => user.value?.isAdmin()  ?? false)
  const isStaff         = computed(() => user.value?.isStaff()  ?? false)
  const isTenant        = computed(() => user.value?.isTenant() ?? false)

  function login(payload: { username: string; access_token: string; refresh_token: string; id?: number; email?: string; role?: Role }): void {
    const newUser = new User(payload.id ?? 0, payload.username, payload.email ?? '', payload.role ?? Role.TENANT, true)
    const s       = new Session(payload.access_token, payload.refresh_token, newUser)
    s.save(); session.value = s
  }

  function logout(): void {
    Session.clear(); session.value = null
  }

  function updateToken(newAccessToken: string): void {
    if (!session.value) return
    const s = new Session(newAccessToken, session.value.refreshToken, session.value.user)
    s.save(); session.value = s
  }

  return { isAuthenticated, user, token, refreshToken, isAdmin, isStaff, isTenant, login, logout, updateToken }
})