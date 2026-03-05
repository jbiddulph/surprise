<script setup lang="ts">
const route = useRoute()
const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')
const showDebug = ref(false)
const imageStatus = reactive<Record<string, 'pending' | 'loaded' | 'error'>>({})

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    profile.value = await $fetch(`/api/public/profile/${route.params.id}`)
    for (const image of profile.value?.images || []) {
      imageStatus[image.id] = 'pending'
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to load profile'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="pop-in space-y-4">
    <div v-if="loading" class="pop-panel">Loading profile...</div>
    <p v-else-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">
      {{ error }}
    </p>
    <template v-else-if="profile">
    <h1 class="text-5xl">{{ profile.user.display_name }}</h1>
    <div class="pop-panel">
      <p class="font-bold">{{ profile.bio || 'No bio yet.' }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <span class="pop-chip">{{ profile.body_type || 'Unknown body type' }}</span>
        <span class="pop-chip">{{ profile.fitness_level || 'Unknown fitness level' }}</span>
        <span class="pop-chip">{{ profile.height_range || 'Unknown height range' }}</span>
      </div>

      <div v-if="profile.images?.length" class="stagger-pop mt-5 grid gap-4 sm:grid-cols-2">
        <article v-for="image in profile.images" :key="image.id" class="rounded-xl border-4 border-black bg-white p-3">
          <img
            :src="image.image_url"
            alt="Profile image"
            class="h-52 w-full rounded-lg border-2 border-black object-cover"
            @load="imageStatus[image.id] = 'loaded'"
            @error="imageStatus[image.id] = 'error'"
          />
          <p class="mt-2 text-sm font-extrabold uppercase">
            Community score: {{ image.avg_rating ?? 'No ratings yet' }}
            <span v-if="image.rating_count">({{ image.rating_count }} votes)</span>
          </p>
          <p class="mt-1 text-xs font-bold uppercase">Image state: {{ imageStatus[image.id] || 'pending' }}</p>
        </article>
      </div>

      <NuxtLink :to="`/profile/${profile.id}/respond`" class="pop-btn mt-4">Respond</NuxtLink>
    </div>
    <div class="pop-panel">
      <button class="pop-btn-alt" type="button" @click="showDebug = !showDebug">
        {{ showDebug ? 'Hide debug' : 'Show debug' }}
      </button>
      <div v-if="showDebug" class="mt-3 space-y-3 text-xs font-bold">
        <p>Profile ID: {{ profile.id }}</p>
        <p>Image count: {{ profile.images?.length || 0 }}</p>
        <div v-for="image in profile.images || []" :key="`dbg-${image.id}`" class="rounded-lg border-2 border-black bg-[#fffce6] p-2">
          <p>ID: {{ image.id }}</p>
          <p>Status: {{ imageStatus[image.id] || 'pending' }}</p>
          <p class="break-all">URL: {{ image.image_url }}</p>
        </div>
      </div>
    </div>
    </template>
  </section>
</template>
