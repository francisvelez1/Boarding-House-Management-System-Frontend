<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { NotificationItem } from '../../services/notificationService'
import type { ManagerMessage, MessageableTenant } from '../../services/managerService'
import { managerService } from '../../services/managerService'

defineProps<{
  loading: boolean
  notifications: NotificationItem[]
  activityDotClass: (type: string) => string
  timeAgo: (value: string) => string
}>()

const activeTab = ref<'messages' | 'notifications'>('messages')
const messages = ref<ManagerMessage[]>([])
const msgTenants = ref<MessageableTenant[]>([])
const msgLoading = ref(false)
const msgError = ref('')

const showCompose = ref(false)
const composeForm = ref({ tenant_id: '', subject: '', body: '' })
const composeSending = ref(false)
const composeSuccess = ref('')

const selectedThread = ref<string | null>(null)
const threadMessages = ref<ManagerMessage[]>([])
const threadLoading = ref(false)
const replyBody = ref('')
const replySending = ref(false)

onMounted(async () => {
  msgLoading.value = true
  try {
    const [msgs, tenants] = await Promise.all([
      managerService.getMessages(),
      managerService.getMessageableTenants(),
    ])
    messages.value = msgs
    msgTenants.value = tenants
  } catch { /* silent */ }
  msgLoading.value = false
})

// Group messages by thread for the list view
const threadList = computed(() => {
  const map = new Map<string, ManagerMessage>()
  for (const m of messages.value) {
    const tid = m.thread_id ?? m.id
    if (!map.has(tid)) map.set(tid, m)
  }
  return Array.from(map.values())
})

function selectedTenantUser(): MessageableTenant | undefined {
  return msgTenants.value.find(t => t.id === composeForm.value.tenant_id)
}

async function sendMessage() {
  const tenant = selectedTenantUser()
  if (!tenant) { msgError.value = 'Select a tenant.'; return }
  if (!composeForm.value.body.trim()) { msgError.value = 'Message cannot be empty.'; return }
  composeSending.value = true
  msgError.value = ''
  try {
    await managerService.sendMessage({
      receiver_id: tenant.user_id,
      tenant_id: tenant.id,
      body: composeForm.value.body,
      subject: composeForm.value.subject || undefined,
    })
    composeSuccess.value = 'Message sent!'
    composeForm.value = { tenant_id: '', subject: '', body: '' }
    messages.value = await managerService.getMessages()
    setTimeout(() => { composeSuccess.value = ''; showCompose.value = false }, 1500)
  } catch (e: any) {
    msgError.value = e?.message ?? 'Failed to send message.'
  } finally {
    composeSending.value = false
  }
}

async function openThread(threadId: string) {
  selectedThread.value = threadId
  threadLoading.value = true
  try {
    threadMessages.value = await managerService.getThread(threadId)
  } catch {
    threadMessages.value = messages.value.filter(m => m.thread_id === threadId)
  }
  threadLoading.value = false
}

async function sendReply() {
  if (!replyBody.value.trim() || !selectedThread.value) return
  // Find tenant's message to get correct receiver_id (tenant's user_id)
  const tenantMsg = threadMessages.value.find(m => m.direction === 'TENANT_TO_MANAGEMENT')
  const anyMsg = threadMessages.value[0]
  if (!anyMsg) return
  // receiver_id should be the tenant's user_id (sender_id of a TENANT_TO_MANAGEMENT msg)
  const receiverId = tenantMsg ? tenantMsg.sender_id : anyMsg.receiver_id
  replySending.value = true
  try {
    await managerService.sendMessage({
      receiver_id: receiverId,
      tenant_id: anyMsg.tenant_id,
      body: replyBody.value,
      thread_id: selectedThread.value,
    })
    replyBody.value = ''
    threadMessages.value = await managerService.getThread(selectedThread.value)
    messages.value = await managerService.getMessages()
  } catch { /* silent */ }
  replySending.value = false
}

function closeThread() {
  selectedThread.value = null
  threadMessages.value = []
}

function formatTime(v?: string) {
  if (!v) return ''
  return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div>
    <div class="page-hdr">
      <div><h1 class="page-title">Messages</h1><p class="page-sub">Conversations with tenants &amp; system notifications</p></div>
      <div class="hdr-actions">
        <button class="btn-primary" @click="showCompose = true; msgError = ''; composeSuccess = ''">+ New Message</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="msg-tabs">
      <button :class="['msg-tab', activeTab === 'messages' && 'msg-tab-active']" @click="activeTab = 'messages'">Conversations</button>
      <button :class="['msg-tab', activeTab === 'notifications' && 'msg-tab-active']" @click="activeTab = 'notifications'">Notifications</button>
    </div>

    <!-- MESSAGES TAB -->
    <div v-if="activeTab === 'messages'" class="panel" style="margin-top:12px">
      <!-- Thread view -->
      <template v-if="selectedThread">
        <div class="msg-thread-header">
          <button class="btn-outline" @click="closeThread" style="padding:4px 10px;font-size:12px">← Back</button>
          <span class="panel-title">Thread {{ selectedThread.slice(0,8) }}</span>
        </div>
        <div v-if="threadLoading" class="td-muted" style="padding:20px">Loading…</div>
        <div class="msg-thread-view">
          <div v-for="m in threadMessages" :key="m.id" :class="['msg-bubble', m.direction === 'MANAGEMENT_TO_TENANT' ? 'msg-bubble-out' : 'msg-bubble-in']">
            <div class="msg-bubble-from">{{ m.direction === 'MANAGEMENT_TO_TENANT' ? 'You' : (m.tenant_name ?? 'Tenant') }}</div>
            <div class="msg-bubble-body">{{ m.body }}</div>
            <div class="msg-bubble-time">{{ formatTime(m.created_at) }}</div>
          </div>
        </div>
        <div class="msg-reply-bar">
          <input v-model="replyBody" class="form-input" placeholder="Type a reply…" @keydown.enter="sendReply" style="flex:1" />
          <button class="btn-primary" :disabled="replySending" @click="sendReply">{{ replySending ? '…' : 'Send' }}</button>
        </div>
      </template>

      <!-- Conversation list -->
      <template v-else>
        <div v-if="msgLoading" class="td-muted" style="padding:20px">Loading messages…</div>
        <div v-for="m in threadList" :key="m.thread_id ?? m.id" class="msg-row" @click="openThread(m.thread_id ?? m.id)">
          <div class="msg-row-avatar">{{ (m.tenant_name ?? 'T')[0] }}</div>
          <div class="msg-row-body">
            <div class="msg-row-top">
              <span class="msg-row-name">{{ m.tenant_name ?? 'Unknown' }}</span>
              <span class="msg-row-time">{{ formatTime(m.created_at) }}</span>
            </div>
            <div v-if="m.subject" class="msg-row-subject">{{ m.subject }}</div>
            <div class="msg-row-preview">{{ m.body }}</div>
          </div>
          <span v-if="m.status === 'UNREAD' && m.direction !== 'MANAGEMENT_TO_TENANT'" class="msg-unread-indicator"></span>
        </div>
        <div v-if="!msgLoading && threadList.length === 0" class="td-muted" style="padding:24px;text-align:center">No conversations yet. Send a message to a tenant to start.</div>
      </template>
    </div>

    <!-- NOTIFICATIONS TAB -->
    <div v-if="activeTab === 'notifications'" class="panel" style="margin-top:12px">
      <div class="activity-list full">
        <div v-if="loading" class="td-muted">Loading…</div>
        <div v-for="n in notifications" :key="n.id" class="activity-item">
          <span class="activity-dot" :class="activityDotClass(n.notification_type)"></span>
          <div class="activity-body"><p class="activity-text"><strong>{{ n.title }}</strong> — {{ n.message }}</p><span class="activity-time">{{ timeAgo(n.created_at) }} · {{ n.notification_type }}</span></div>
        </div>
        <div v-if="!loading && notifications.length === 0" class="td-muted">No notifications.</div>
      </div>
    </div>

    <!-- COMPOSE MODAL -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCompose" class="modal-overlay" @click.self="showCompose = false">
          <div class="modal-box" style="max-width:480px">
            <div class="modal-hdr"><h2 class="modal-title">New Message</h2><button class="modal-close" @click="showCompose = false">✕</button></div>
            <div v-if="msgError" class="form-error">{{ msgError }}</div>
            <div v-if="composeSuccess" style="margin:0 24px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;color:#166534;font-size:12.5px;">{{ composeSuccess }}</div>
            <div class="modal-form">
              <div class="form-group">
                <label>To (Tenant) <span class="req">*</span></label>
                <select v-model="composeForm.tenant_id" class="form-input">
                  <option value="">— Select tenant —</option>
                  <option v-for="t in msgTenants" :key="t.id" :value="t.id">{{ t.full_name }}</option>
                </select>
              </div>
              <div class="form-group"><label>Subject</label><input v-model="composeForm.subject" type="text" class="form-input" placeholder="Optional subject" /></div>
              <div class="form-group"><label>Message <span class="req">*</span></label><textarea v-model="composeForm.body" class="form-textarea" rows="4" placeholder="Type your message…"></textarea></div>
              <div class="modal-footer">
                <button type="button" class="btn-outline" @click="showCompose = false">Cancel</button>
                <button type="button" class="btn-primary" :disabled="composeSending" @click="sendMessage">{{ composeSending ? 'Sending…' : 'Send Message' }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.msg-tabs { display: flex; gap: 4px; }
.msg-tab { padding: 8px 18px; border: none; background: #f3f0fb; color: #6b7280; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 9px 9px 0 0; font-family: inherit; }
.msg-tab-active { background: #fff; color: #ae68fa; border-bottom: 2px solid #ae68fa; }
.msg-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #f3f0fb; transition: background 0.1s; }
.msg-row:hover { background: #faf7ff; }
.msg-row-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #ae68fa, #f1966e); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.msg-row-body { flex: 1; min-width: 0; }
.msg-row-top { display: flex; justify-content: space-between; align-items: center; }
.msg-row-name { font-size: 13px; font-weight: 700; color: #160d27; }
.msg-row-time { font-size: 11px; color: #9ca3af; }
.msg-row-subject { font-size: 12px; font-weight: 600; color: #374151; margin-top: 2px; }
.msg-row-preview { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.msg-unread-indicator { width: 8px; height: 8px; border-radius: 50%; background: #ae68fa; flex-shrink: 0; }
.msg-thread-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f3f0fb; }
.msg-thread-view { max-height: 400px; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg-bubble { max-width: 75%; padding: 10px 14px; border-radius: 14px; font-size: 13px; }
.msg-bubble-out { align-self: flex-end; background: linear-gradient(135deg, #ae68fa, #c084fc); color: #fff; }
.msg-bubble-in { align-self: flex-start; background: #f3f0fb; color: #160d27; }
.msg-bubble-from { font-size: 10px; font-weight: 700; opacity: 0.7; margin-bottom: 2px; }
.msg-bubble-body { line-height: 1.4; }
.msg-bubble-time { font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right; }
.msg-reply-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f3f0fb; }
</style>
