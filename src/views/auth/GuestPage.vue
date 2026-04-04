<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../../assets/Logo.png'
import starTrail from '../../assets/Design.png'

const router = useRouter()

// Filter State
const selectedType = ref('All rooms')
const selectedStatus = ref('Available')

const roomTypes = ['All rooms', 'Single', 'Double', 'Shared', 'Studio']
const roomStatus = ['Available', 'All']

const goToLogin = () => router.push('/login')
const goToRegister = () => router.push('/register')
</script>

<template>
  <div class="auth-container">
    <img :src="starTrail" class="bg-design" alt="design">

    <nav class="navbar">
      <div class="brand">
        <img :src="logo" alt="ResidEase" class="logo">
        <span class="brand-name">ResidEase</span>
      </div>

      <div class="nav-links">
        <button class="nav-btn">Browse Rooms</button>
        <button class="nav-btn">About</button>
        <button class="nav-btn">Contact Us</button>
      </div>

      <div class="auth-actions">
        <button class="text-link" @click="goToLogin">Log In</button>
        <button class="btn-primary mini" @click="goToRegister">Sign Up</button>
      </div>
    </nav>

    <main class="content">
      <div class="hero-section">
        <div class="status-pill">
          <span class="dot"></span> 18 rooms available now
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
            <input type="text" placeholder="Search location..." class="input-minimal" />
          </div>
          <div class="v-divider"></div>
          <div class="price-group">
            <select class="input-minimal">
              <option>Any price</option>
              <option>₱1,000 - ₱3,000</option>
              <option>₱3,000 - ₱5,000</option>
            </select>
          </div>
          <button class="btn-search">Search</button>
        </div>
      </div>

      <div class="filter-container">
        <div class="filter-card">
          <div class="filter-row">
            <span class="filter-label">Type:</span>
            <div class="chip-group">
              <button 
                v-for="type in roomTypes" :key="type"
                :class="['chip', { active: selectedType === type }]"
                @click="selectedType = type"
              >{{ type }}</button>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">Status:</span>
            <div class="chip-group">
              <button 
                v-for="status in roomStatus" :key="status"
                :class="['chip', { active: selectedStatus === status }]"
                @click="selectedStatus = status"
              >{{ status }}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Inherited from LoginView.vue */
.auth-container {
  min-height: 100vh;
  width: 100%;
  background: #faf7ff; /* Matching your Login background */
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.bg-design {
  position: absolute;
  top: -100px;
  left: -50px;
  width: 600px;
  opacity: 0.8;
  pointer-events: none;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 80px;
  z-index: 10;
}

.brand { display: flex; align-items: center; gap: 12px; }
.logo { width: 45px; height: 40px; }
.brand-name { font-size: 20px; font-weight: 700; color: #6b7280; }

.nav-links { display: flex; gap: 32px; }
.nav-btn {
  background: none; border: none; color: #6b7280;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: color 0.2s;
}
.nav-btn:hover { color: #ae68fa; }

/* Buttons matching LoginView.vue */
.btn-primary {
  background: #ae68fa;
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(174, 104, 250, 0.3);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(174, 104, 250, 0.4); }
.btn-primary.mini { padding: 8px 20px; }

.text-link {
  background: transparent; border: none;
  font-size: 14px; font-weight: 600; color: #6366f1;
  cursor: pointer; margin-right: 20px;
}

/* Hero Section */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  z-index: 5;
}

.hero-section { text-align: center; max-width: 800px; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  border: 1px solid rgba(210, 196, 255, 0.5);
  margin-bottom: 24px;
}
.dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; }

.title {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  color: #1f2937;
  margin-bottom: 20px;
}

.gradient-text {
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle {
  font-size: 18px;
  color: #6b7280;
  max-width: 500px;
  margin: 0 auto 40px;
}

/* Search bar matching Card style */
.search-card {
  background: #fff;
  padding: 12px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  box-shadow: 0 20px 50px rgba(149, 132, 226, 0.15);
  border: 1px solid rgba(210, 196, 255, 0.4);
  width: 100%;
  max-width: 650px;
}

.search-group { flex: 1; display: flex; align-items: center; padding-left: 15px; }
.input-minimal {
  border: none; outline: none; width: 100%;
  font-size: 15px; color: #4b5563; background: transparent;
}
.v-divider { width: 1px; height: 30px; background: #e0ddf7; margin: 0 20px; }

.btn-search {
  background: #1f2937;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 20px;
  font-weight: 700;
  cursor: pointer;
}

/* Filter Section */
.filter-container { margin-top: 40px; width: 100%; max-width: 650px; }
.filter-card {
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(210, 196, 255, 0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row { display: flex; align-items: center; gap: 16px; }
.filter-label { font-size: 14px; font-weight: 700; color: #9ca3af; width: 60px; }
.chip-group { display: flex; gap: 8px; }

.chip {
  background: transparent;
  border: 1px solid #e0ddf7;
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: 0.2s;
}

.chip.active {
  background: rgba(174, 104, 250, 0.1);
  border-color: #ae68fa;
  color: #ae68fa;
}

@media (max-width: 768px) {
  .navbar { padding: 20px; }
  .nav-links { display: none; }
  .title { font-size: 48px; }
  .search-card { flex-direction: column; border-radius: 20px; gap: 10px; }
  .v-divider { display: none; }
}
</style>