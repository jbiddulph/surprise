<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  auth.clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b-4 border-black bg-[var(--pop-yellow)]">
      <nav class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NuxtLink to="/" class="rounded-xl border-4 border-black bg-white px-3 py-1 text-2xl shadow-[4px_4px_0_0_#111]">
          SurpriseMe
        </NuxtLink>
        <div class="flex items-center gap-3 text-sm font-extrabold uppercase tracking-wide">
          <NuxtLink to="/about" class="rounded-lg border-2 border-black bg-white px-3 py-1">About</NuxtLink>
          <NuxtLink to="/explore" class="rounded-lg border-2 border-black bg-white px-3 py-1">Explore</NuxtLink>
          <template v-if="auth.isAuthenticated">
            <NuxtLink to="/dashboard" class="pop-btn">Dashboard</NuxtLink>
            <button type="button" class="pop-btn-alt" @click="logout">Logout</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="pop-btn-alt">Login</NuxtLink>
            <NuxtLink to="/register" class="pop-btn">Register</NuxtLink>
          </template>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
