<script setup lang="ts">
type Profile = {
  id: string
  bio: string | null
  body_type: string | null
  fitness_level: string | null
  user: { display_name: string }
}

const profiles = ref<Profile[]>([])
const loading = ref(false)

async function loadProfiles() {
  loading.value = true
  try {
    profiles.value = await $fetch('/api/public/profiles')
  } catch {
    profiles.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadProfiles)
</script>

<template>
  <section class="pop-in space-y-4">
    <h1 class="text-4xl">Explore Profiles</h1>
    <p class="font-bold">Pick a profile and contribute positive, classy feedback.</p>
    <div v-if="loading" class="pop-panel">Loading...</div>
    <div v-else class="stagger-pop grid gap-4 md:grid-cols-2">
      <article v-for="profile in profiles" :key="profile.id" class="pop-panel">
        <h2 class="text-3xl">{{ profile.user.display_name }}</h2>
        <p class="mt-2 font-bold">{{ profile.bio || 'No bio yet.' }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="pop-chip">{{ profile.body_type || 'Unknown body type' }}</span>
          <span class="pop-chip">{{ profile.fitness_level || 'Unknown fitness level' }}</span>
        </div>
        <NuxtLink :to="`/profile/${profile.id}`" class="pop-link mt-4 inline-block">View Profile</NuxtLink>
      </article>
    </div>
  </section>
</template>
