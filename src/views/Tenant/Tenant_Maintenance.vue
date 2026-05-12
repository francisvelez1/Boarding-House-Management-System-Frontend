<script setup lang="ts">
import MaintenanceCard from '../../components/TenantsUI_Components/MaintenanceCard.vue'

defineProps<{
  maintenanceForCard: any[]
}>()

const emit = defineEmits<{
  (e: 'submit-new'): void
}>()
</script>

<template>
  <div v-show="true" id="maintenance">
    <main class="content">
      <section class="section--full">
        <MaintenanceCard :requests="maintenanceForCard" @submit-new="emit('submit-new')" />
      </section>
    </main>
  </div>
</template>