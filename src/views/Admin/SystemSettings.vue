<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService, type SystemSettingsData } from '../../services/adminService'

const sectionLoading = ref(false)
const settingsData = ref<SystemSettingsData | null>(null)
const settingsSaved = ref(false)
const error = ref('')

async function fetchSettingsData() {
  sectionLoading.value = true
  settingsSaved.value = false
  try {
    settingsData.value = await adminService.getSystemSettings()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load settings.'
  } finally {
    sectionLoading.value = false
  }
}

async function saveSettings() {
  if (!settingsData.value) return
  try {
    await adminService.updateSystemSettings(settingsData.value)
    settingsSaved.value = true
    setTimeout(() => { settingsSaved.value = false }, 3000)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to save settings.'
  }
}

onMounted(fetchSettingsData)
</script>

<template>
  <section class="section">
    <div v-if="error" class="error-banner">{{ error }}</div>
    <div class="section-hdr">
      <div>
        <h1 class="section-title">System settings</h1>
        <p class="section-sub">Global configuration for ResidEase.</p>
      </div>
    </div>
    <div v-if="sectionLoading" class="section-loading">Loading settings…</div>
    <div v-else-if="settingsData" class="card settings-form">
      <div class="settings-row">
        <label class="settings-label">Site Name</label>
        <input v-model="settingsData.site_name" class="settings-input" />
      </div>
      <div class="settings-row">
        <label class="settings-label">Support Email</label>
        <input v-model="settingsData.support_email" class="settings-input" type="email" />
      </div>
      <div class="settings-row">
        <label class="settings-label">Session Timeout (minutes)</label>
        <input v-model.number="settingsData.session_timeout_minutes" class="settings-input" type="number" min="1" />
      </div>
      <div class="settings-row settings-toggle-row">
        <label class="settings-label">Maintenance Mode</label>
        <input v-model="settingsData.maintenance_mode" type="checkbox" class="settings-checkbox" />
      </div>
      <div class="settings-row settings-toggle-row">
        <label class="settings-label">Allow Registration</label>
        <input v-model="settingsData.allow_registration" type="checkbox" class="settings-checkbox" />
      </div>
      <div class="settings-actions">
        <button class="back-btn" @click="saveSettings()">Save Changes</button>
        <span v-if="settingsSaved" class="save-ok">✓ Saved successfully</span>
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
.card { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
.back-btn { margin-top: 8px; padding: 9px 20px; border-radius: 9px; border: none; background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
.back-btn:hover { opacity: 0.88; }
.settings-form { padding: 24px; max-width: 560px; }
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f0fb; gap: 16px; }
.settings-label { font-size: 13px; font-weight: 600; color: #374151; flex-shrink: 0; }
.settings-input { flex: 1; border: 1.5px solid #e0ddf7; border-radius: 8px; padding: 7px 10px; font-size: 13px; font-family: inherit; color: #160d27; outline: none; transition: border-color 0.15s; }
.settings-input:focus { border-color: #a78bfa; }
.settings-checkbox { width: 16px; height: 16px; accent-color: #7c3aed; cursor: pointer; }
.settings-actions { display: flex; align-items: center; gap: 14px; padding-top: 18px; }
.save-ok { font-size: 12px; font-weight: 700; color: #166534; }
</style>
