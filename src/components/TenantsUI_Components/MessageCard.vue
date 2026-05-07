<script setup lang="ts">
import BaseCard from './Card.vue'

export interface Message {
  id: number
  senderName: string
  preview: string
  time: string   // e.g. '2h ago', 'Yesterday', 'Mar 18'
  isUnread?: boolean
}

defineProps<{ messages: Message[] }>()
const emit = defineEmits<{ openMessage: [id: number] }>()

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const avatarColors = ['#e3ebff', '#e6f9f0', '#fff0f0', '#fff8e6']
const textColors   = ['#4f6ef7', '#1a8a52', '#e74c3c', '#b07d0a']
</script>

<template>
  <BaseCard title="Messages from management" link-text="View all" link-href="#">
    <div
      v-for="(msg, index) in messages"
      :key="msg.id"
      class="msg-item"
      @click="emit('openMessage', msg.id)"
    >
      <!-- Avatar -->
      <div
        class="msg-avatar"
        :style="{
          background: avatarColors[index % avatarColors.length],
          color: textColors[index % textColors.length],
        }"
      >
        {{ initials(msg.senderName) }}
      </div>

      <!-- Content -->
      <div class="msg-content">
        <div class="msg-top">
          <span class="msg-sender">{{ msg.senderName }}</span>
          <span class="msg-time">{{ msg.time }}</span>
        </div>
        <p class="msg-preview">{{ msg.preview }}</p>
      </div>

      <!-- Unread dot -->
      <span v-if="msg.isUnread" class="msg-unread-dot" />
    </div>
  </BaseCard>
</template>

<style scoped>
.msg-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.msg-item:last-child {
  border-bottom: none;
}

.msg-item:hover {
  background: #f8f9fa;
  padding-left: 8px;
}

.msg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.msg-content {
  flex: 1;
  min-width: 0;
}

.msg-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.msg-sender {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.msg-time {
  font-size: 12px;
  color: #aaa;
}

.msg-preview {
  font-size: 13px;
  color: #777;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg-unread-dot {
  width: 8px;
  height: 8px;
  background: #4f6ef7;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}
</style>