<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService, type SystemHealthResponse } from '../../services/adminService'

const sectionLoading = ref(false)
const healthData = ref<SystemHealthResponse | null>(null)
const error = ref('')

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

async function fetchHealthData() {
  sectionLoading.value = true
  try {
    healthData.value = await adminService.getSystemHealth()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load system health.'
  } finally {
    sectionLoading.value = false
  }
}

onMounted(fetchHealthData)
</script>

<template>
  <section class="section">
    <div v-if="error" class="error-banner">{{ error }}</div>
    <div class="section-hdr">
      <div>
        <h1 class="section-title">System health</h1>
        <p class="section-sub">Real-time system status and infrastructure overview.</p>
      </div>
      <button class="back-btn" @click="fetchHealthData()">↻ Refresh</button>
    </div>
    <div v-if="sectionLoading" class="section-loading">Loading health…</div>
    <div v-else-if="healthData" class="health-grid">
      <div class="health-card" :class="healthData.status === 'healthy' ? 'hc-healthy' : 'hc-degraded'">
        <div class="health-icon">{{ healthData.status === 'healthy' ? '✅' : '⚠️' }}</div>
        <div class="health-label">Status</div>
        <div class="health-value">{{ healthData.status }}</div>
      </div>
      <div class="health-card">
        <div class="health-icon">⏱️</div>
        <div class="health-label">Uptime</div>
        <div class="health-value">{{ formatUptime(healthData.uptime_seconds) }}</div>
      </div>
      <div class="health-card" :class="healthData.database.connected ? 'hc-healthy' : 'hc-degraded'">
        <div class="health-icon">{{ healthData.database.connected ? '🟢' : '🔴' }}</div>
        <div class="health-label">Database</div>
        <div class="health-value">{{ healthData.database.connected ? 'Connected' : 'Disconnected' }}</div>
      </div>
      <div class="health-card">
        <div class="health-icon">👥</div>
        <div class="health-label">Total Users</div>
        <div class="health-value">{{ healthData.stats.users }}</div>
      </div>
      <div class="health-card">
        <div class="health-icon">🕐</div>
        <div class="health-label">Last Checked</div>
        <div class="health-value health-value-sm">{{ formatTimestamp(healthData.timestamp) }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.error-banner { margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 12px; }
.section-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.section-title { font-size: 22px; font-weight: 700; color: #160d27; }
.section-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
.section-loading { text-align: center; color: #9ca3af; padding: 48px; font-size: 14px; }
.back-btn { margin-top: 8px; padding: 9px 20px; border-radius: 9px; border: none; background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
.back-btn:hover { opacity: 0.88; }
.health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
.health-card { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 22px 18px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.health-card.hc-healthy { border-color: #bbf7d0; background: #f0fdf4; }
.health-card.hc-degraded { border-color: #fca5a5; background: #fef2f2; }
.health-icon { font-size: 28px; }
.health-label { font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.health-value { font-size: 20px; font-weight: 700; color: #160d27; }
.health-value-sm { font-size: 12px; font-weight: 600; color: #374151; }
</style>
