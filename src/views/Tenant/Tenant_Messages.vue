<script setup lang="ts">
defineProps<{
  inboxThreads: any[]
}>()

const emit = defineEmits<{
  (e: 'open-compose'): void
  (e: 'open-thread', threadId: string): void
}>()
</script>

<template>
  <div v-show="true" id="messages">
    <main class="content">
      <section class="section--full">
        <div class="msg-inbox-card">
          <div class="msg-inbox-header">
            <span class="msg-inbox-title">Messages from management</span>
            <button class="btn-compose" @click="emit('open-compose')">✏️ New message</button>
          </div>

          <!-- Thread list -->
          <div v-if="inboxThreads.length" class="msg-thread-list">
            <div
              v-for="m in inboxThreads"
              :key="m.thread_id ?? m.id"
              class="msg-thread-item"
              :class="{ 'msg-thread-item--unread': m.status === 'UNREAD' && m.direction === 'MANAGEMENT_TO_TENANT' }"
              @click="emit('open-thread', m.thread_id ?? m.id)"
            >
              <div class="msg-thread-avatar">
                {{ m.direction === 'MANAGEMENT_TO_TENANT' ? 'RE' : 'Me' }}
              </div>
              <div class="msg-thread-body">
                <div class="msg-thread-top">
                  <span class="msg-thread-sender">
                    {{ m.direction === 'MANAGEMENT_TO_TENANT' ? (m.sender_name ?? 'ResidEase Admin') : 'You' }}
                  </span>
                  <span class="msg-thread-time">
                    {{ new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                  </span>
                </div>
                <div v-if="m.subject" class="msg-thread-subject">{{ m.subject }}</div>
                <div class="msg-thread-preview">{{ m.body }}</div>
              </div>
              <span v-if="m.status === 'UNREAD' && m.direction === 'MANAGEMENT_TO_TENANT'" class="msg-unread-dot"></span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="msg-empty">
            <div style="font-size:36px;margin-bottom:8px">💬</div>
            <p>No messages yet.</p>
            <button class="btn-compose-empty" @click="emit('open-compose')">Send a message to management</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>