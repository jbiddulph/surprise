<script setup lang="ts">
const route = useRoute()
const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')
const showDebug = ref(false)
const ratingMessage = ref('')
const ratingError = ref('')
const imageStatus = reactive<Record<string, 'pending' | 'loaded' | 'error'>>({})
const imageRatings = reactive<Record<string, number>>({})

function getVisitorToken() {
  const key = 'surpriseme_visitor_token'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const token = crypto.randomUUID()
  localStorage.setItem(key, token)
  return token
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    profile.value = await $fetch(`/api/public/profile/${route.params.id}`)
    for (const image of profile.value?.images || []) {
      imageStatus[image.id] = 'pending'
      imageRatings[image.id] = 7
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to load profile'
  } finally {
    loading.value = false
  }
})

async function submitImageRatings() {
  ratingMessage.value = ''
  ratingError.value = ''

  if (!profile.value?.images?.length) return

  const visitorToken = getVisitorToken()
  try {
    await Promise.all(
      profile.value.images.map((image: any) =>
        $fetch('/api/image-rating/submit', {
          method: 'POST',
          body: {
            profile_id: profile.value.id,
            image_id: image.id,
            rating: Number(imageRatings[image.id] || 7),
            visitor_token: visitorToken
          }
        })
      )
    )
    ratingMessage.value = 'Your image ratings have been submitted.'
  } catch (e: any) {
    ratingError.value = e?.data?.statusMessage || 'Failed to submit image ratings'
  }
}
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
            Category: {{ image.category }} ·
            Community score: {{ image.avg_rating ?? 'No ratings yet' }}
            <span v-if="image.rating_count">({{ image.rating_count }} votes)</span>
          </p>
          <label class="mt-2 block">
            <span class="mb-1 block text-xs font-extrabold uppercase">Your rating (1-10)</span>
            <input v-model.number="imageRatings[image.id]" min="1" max="10" type="number" class="pop-input" />
          </label>
          <p class="mt-1 text-xs font-bold uppercase">Image state: {{ imageStatus[image.id] || 'pending' }}</p>
        </article>
      </div>

      <button v-if="profile.images?.length" type="button" class="pop-btn mt-3" @click="submitImageRatings">Submit image ratings</button>
      <p v-if="ratingMessage" class="mt-2 rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ ratingMessage }}</p>
      <p v-if="ratingError" class="mt-2 rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ ratingError }}</p>

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
