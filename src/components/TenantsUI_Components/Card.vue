<script setup lang="ts">
defineProps<{
  title?: string
  linkText?: string
  linkHref?: string
}>()

defineSlots<{
  default(props: {}): any
  header(props: {}): any
  footer(props: {}): any
}>()
</script>

<template>
  <div class="base-card">
    <div v-if="title || linkText" class="base-card__header">
      <h2 v-if="title" class="base-card__title">{{ title }}</h2>
      <a v-if="linkText" :href="linkHref ?? '#'" class="base-card__link">
        {{ linkText }}
      </a>
    </div>

    <div class="base-card__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
}

.base-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.base-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.base-card__link {
  font-size: 13px;
  color: #4f6ef7;
  text-decoration: none;
  font-weight: 500;
}

.base-card__link:hover {
  text-decoration: underline;
}

.base-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.base-card__footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>