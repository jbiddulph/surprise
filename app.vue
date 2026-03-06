<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const supabase = useSupabaseClient()
const mobileMenuOpen = ref(false)

async function logout() {
  await supabase.auth.signOut()
  auth.clear()
  mobileMenuOpen.value = false
  await navigateTo('/login')
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b-4 border-black bg-[var(--pop-yellow)]">
      <nav class="mx-auto max-w-6xl px-4 py-3">
        <div class="flex items-center justify-between gap-3">
        <NuxtLink to="/" class="rounded-xl border-4 border-black bg-white px-3 py-1 text-2xl shadow-[4px_4px_0_0_#111]">
          SurpriseMe
        </NuxtLink>

          <button
            type="button"
            class="rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-extrabold uppercase md:hidden"
            :aria-expanded="mobileMenuOpen"
            aria-controls="main-menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            Menu
          </button>
        </div>

        <div
          id="main-menu"
          class="mt-3 flex flex-col gap-2 text-sm font-extrabold uppercase tracking-wide md:mt-0 md:flex md:flex-row md:items-center md:justify-end md:gap-3"
          :class="mobileMenuOpen ? 'flex' : 'hidden md:flex'"
        >
          <NuxtLink to="/about" class="rounded-lg border-2 border-black bg-white px-3 py-2 md:py-1" @click="closeMobileMenu">About</NuxtLink>
          <NuxtLink to="/explore" class="rounded-lg border-2 border-black bg-white px-3 py-2 md:py-1" @click="closeMobileMenu">Explore</NuxtLink>
          <template v-if="auth.isAuthenticated">
            <NuxtLink to="/dashboard" class="pop-btn text-center" @click="closeMobileMenu">Dashboard</NuxtLink>
            <button type="button" class="pop-btn-alt" @click="logout">Logout</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="pop-btn-alt text-center" @click="closeMobileMenu">Login</NuxtLink>
            <NuxtLink to="/register" class="pop-btn text-center" @click="closeMobileMenu">Register</NuxtLink>
          </template>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
