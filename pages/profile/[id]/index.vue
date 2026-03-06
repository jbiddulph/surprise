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
const ratingSaving = reactive<Record<string, boolean>>({})
const ratingSaved = reactive<Record<string, boolean>>({})

const scoreOptions = Array.from({ length: 11 }, (_, i) => i)

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
      imageRatings[image.id] = 0
      ratingSaving[image.id] = false
      ratingSaved[image.id] = false
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to load profile'
  } finally {
    loading.value = false
  }
})

function buttonColor(score: number) {
  const hue = 220 - Math.round((220 * score) / 10)
  return `hsl(${hue} 95% 58%)`
}

async function voteImage(imageId: string, score: number) {
  if (!profile.value?.id) return

  ratingMessage.value = ''
  ratingError.value = ''
  ratingSaving[imageId] = true
  ratingSaved[imageId] = false
  imageRatings[imageId] = score

  try {
    const visitorToken = getVisitorToken()
    await $fetch('/api/image-rating/submit', {
      method: 'POST',
      body: {
        profile_id: profile.value.id,
        image_id: imageId,
        rating: score,
        visitor_token: visitorToken
      }
    })
    ratingMessage.value = `Saved vote ${score}/10.`
    ratingSaved[imageId] = true
  } catch (e: any) {
    ratingError.value = e?.data?.statusMessage || 'Failed to submit image ratings'
  } finally {
    ratingSaving[imageId] = false
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
          <div class="mt-3">
            <span class="mb-2 block text-xs font-extrabold uppercase">Tap your rating (0-10)</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="score in scoreOptions"
                :key="`${image.id}-${score}`"
                type="button"
                class="pop-score-btn"
                :class="{ 'is-selected': imageRatings[image.id] === score, 'is-loading': ratingSaving[image.id] }"
                :style="{ background: buttonColor(score) }"
                :disabled="ratingSaving[image.id]"
                @click="voteImage(image.id, score)"
              >
                {{ score }}
              </button>
            </div>
          </div>
          <p v-if="ratingSaved[image.id]" class="mt-2 text-xs font-extrabold uppercase text-[#0f8a00]">
            Your vote: {{ imageRatings[image.id] }}/10
          </p>
          <p class="mt-1 text-xs font-bold uppercase">Image state: {{ imageStatus[image.id] || 'pending' }}</p>
        </article>
      </div>

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

<style scoped>
.pop-score-btn {
  width: 2.2rem;
  height: 2.2rem;
  border: 2px solid #000;
  border-radius: 0.6rem;
  color: #fff;
  font-weight: 900;
  line-height: 1;
  text-shadow: 1px 1px 0 #000;
  box-shadow: 2px 2px 0 #000;
  transform: translateY(0);
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}

.pop-score-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 #000;
  filter: saturate(1.1);
}

.pop-score-btn.is-selected {
  box-shadow: 0 0 0 3px #000 inset, 4px 4px 0 #000;
  transform: translateY(-2px) scale(1.05);
}

.pop-score-btn:disabled,
.pop-score-btn.is-loading {
  opacity: 0.7;
}
</style>
