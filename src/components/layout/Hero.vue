<script setup lang="ts">
import { RoomType, TYPE_LABEL } from '../../models/room'

// `searchCategory` and `selectedType` are intentionally separate props:
//   - `searchCategory` is the value of the hero's quick-pick dropdown.
//   - The page binds it to the same reactive ref as the FilterBar's
//     `selectedType`, so changing one updates the other.
defineProps<{
  availableCount: number
  searchLocation: string
  searchPrice: string
  searchCategory?: string   // 'All' | RoomType — defaults to 'All'
}>()

const emit = defineEmits<{
  (e: 'update:searchLocation', val: string): void
  (e: 'update:searchPrice',    val: string): void
  (e: 'update:searchCategory', val: string): void
  (e: 'search'): void
}>()

const categoryOptions = ['All', ...Object.values(RoomType)] as const
const categoryLabel = (c: string) =>
  c === 'All' ? 'Any category' : TYPE_LABEL[c as RoomType] ?? c
</script>

<template>
  <section class="hero-section">
    <div class="status-pill">
      <span class="dot"></span>
      {{ availableCount }} rooms available now
    </div>

    <h1 class="title">
      Your Space, <br />
      <span class="gradient-text">Your Comfort</span>
    </h1>

    <p class="subtitle">
      Browse available rooms, check amenities, and inquire directly online.
    </p>

    <div class="search-card">
      <div class="search-group">
        <span class="icon">🔍</span>
        <input
          :value="searchLocation"
          type="text"
          placeholder="Search by city, property or room…"
          class="input-minimal"
          @input="emit('update:searchLocation', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="v-divider"></div>
      <div class="category-group">
        <span class="icon">🏷</span>
        <select
          :value="searchCategory ?? 'All'"
          class="input-minimal"
          @change="emit('update:searchCategory', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ categoryLabel(c) }}</option>
        </select>
      </div>
      <div class="v-divider"></div>
      <div class="price-group">
        <select
          :value="searchPrice"
          class="input-minimal"
          @change="emit('update:searchPrice', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Any price</option>
          <option value="2000-3999">₱2,000 – ₱3,999</option>
          <option value="4000-5999">₱4,000 – ₱5,999</option>
          <option value="6000-9999">₱6,000 – ₱9,999</option>
        </select>
      </div>
      <button class="btn-search" @click="emit('search')">Search</button>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  text-align: center;
  padding-top: 60px;
  z-index: 5;
  position: relative;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; padding: 6px 16px; border-radius: 20px;
  font-size: 13px; font-weight: 600; color: #6366f1;
  border: 1px solid rgba(210,196,255,0.5); margin-bottom: 24px;
}
.dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; }
.title {
  font-size: 72px; font-weight: 800; line-height: 1.1;
  color: #1f2937; margin-bottom: 20px;
}
.gradient-text {
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.subtitle {
  font-size: 18px; color: #6b7280;
  max-width: 500px; margin: 0 auto 40px;
}
.search-card {
  background: #fff; padding: 12px; border-radius: 30px;
  display: flex; align-items: center;
  box-shadow: 0 20px 50px rgba(149,132,226,0.15);
  border: 1px solid rgba(210,196,255,0.4);
  width: 100%; max-width: 780px; margin: 0 auto;
}
.search-group   { flex: 1; display: flex; align-items: center; padding-left: 15px; }
.category-group { display: flex; align-items: center; min-width: 0; }
.price-group    { display: flex; align-items: center; min-width: 0; }
.icon         { margin-right: 6px; }
.input-minimal {
  border: none; outline: none; width: 100%;
  font-size: 15px; color: #4b5563; background: transparent;
}
.v-divider { width: 1px; height: 30px; background: #e0ddf7; margin: 0 20px; }
.btn-search {
  background: #1f2937; color: white; border: none;
  padding: 12px 30px; border-radius: 20px;
  font-weight: 700; cursor: pointer; white-space: nowrap;
}
.btn-search:hover { background: #374151; }

@media (max-width: 768px) {
  .title       { font-size: 48px; }
  .search-card { flex-direction: column; border-radius: 20px; gap: 10px; }
  .v-divider   { display: none; }
}
</style>