<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeadersSafe } from '~/composables/useApi'

const route = useRoute()
const auth = useAuthStore()
const message = ref('')
const error = ref('')
const profile = ref<any>(null)
const imageRatings = reactive<Record<string, number>>({})
const ratingSaving = reactive<Record<string, boolean>>({})
const ratingSaved = reactive<Record<string, boolean>>({})
const scoreOptions = Array.from({ length: 11 }, (_, i) => i)

const form = reactive({
  attractiveness_rating: 'Attractive',
  body_type_perception: 'Athletic',
  confidence_perception: 'Confident',
  approachability: 'Friendly',
  comment: ''
})

async function loadProfile() {
  profile.value = await $fetch(`/api/public/profile/${route.params.id}`)
  for (const image of profile.value.images || []) {
    imageRatings[image.id] = 0
    ratingSaving[image.id] = false
    ratingSaved[image.id] = false
  }
}

function buttonColor(score: number) {
  const hue = 220 - Math.round((220 * score) / 10)
  return `hsl(${hue} 95% 58%)`
}

async function voteImage(imageId: string, score: number) {
  ratingSaving[imageId] = true
  ratingSaved[imageId] = false
  imageRatings[imageId] = score
  error.value = ''

  try {
    const headers = await useApiAuthHeadersSafe()
    await $fetch('/api/image-rating/submit', {
      method: 'POST',
      headers,
      body: {
        profile_id: route.params.id,
        image_id: imageId,
        rating: score
      }
    })
    ratingSaved[imageId] = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to save image rating'
  } finally {
    ratingSaving[imageId] = false
  }
}

async function submit() {
  message.value = ''
  error.value = ''

  if (!auth.isAuthenticated) {
    error.value = 'Please log in before submitting feedback.'
    return
  }

  try {
    const headers = await useApiAuthHeadersSafe()
    await $fetch('/api/questionnaire/submit', {
      method: 'POST',
      headers,
      body: {
        profile_id: route.params.id,
        ...form
      }
    })

    const images = profile.value?.images || []
    if (images.length) {
      const settled = await Promise.allSettled(
        images.map((image: any) =>
          $fetch('/api/image-rating/submit', {
            method: 'POST',
            headers,
            body: {
              profile_id: route.params.id,
              image_id: image.id,
              rating: Number(imageRatings[image.id] ?? 0)
            }
          })
        )
      )

      const failed = settled.filter((result) => result.status === 'rejected').length
      if (failed > 0) {
        message.value = `Feedback saved. ${failed} image rating(s) failed to save.`
        return
      }
    }

    message.value = 'Thanks for contributing positive feedback and image ratings.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Submission failed'
  }
}

onMounted(loadProfile)
</script>

<template>
  <section class="pop-in mx-auto max-w-2xl space-y-4">
    <h1 class="text-4xl">Submit Feedback</h1>
    <form class="pop-panel space-y-3" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1 block text-sm font-extrabold uppercase">Attractiveness</span>
        <select v-model="form.attractiveness_rating" class="pop-select">
          <option>Very attractive</option>
          <option>Attractive</option>
          <option>Average</option>
          <option>Below average</option>
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-extrabold uppercase">Body type perception</span>
        <input v-model="form.body_type_perception" class="pop-input" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-extrabold uppercase">Confidence</span>
        <select v-model="form.confidence_perception" class="pop-select">
          <option>Very confident</option>
          <option>Confident</option>
          <option>Neutral</option>
          <option>Slightly shy</option>
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-extrabold uppercase">Approachability</span>
        <select v-model="form.approachability" class="pop-select">
          <option>Very approachable</option>
          <option>Friendly</option>
          <option>Neutral</option>
          <option>Intimidating</option>
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-extrabold uppercase">Positive comment (optional)</span>
        <textarea v-model="form.comment" rows="3" maxlength="280" class="pop-textarea" />
      </label>

      <div v-if="profile?.images?.length" class="space-y-3">
        <h2 class="text-3xl">Rate Images (0-10)</h2>
        <div class="stagger-pop grid gap-3 sm:grid-cols-2">
          <article v-for="image in profile.images" :key="image.id" class="rounded-xl border-4 border-black bg-white p-3">
            <img :src="image.image_url" alt="Profile image" class="h-44 w-full rounded-lg border-2 border-black object-cover" />
            <div class="mt-3">
              <span class="mb-2 block text-xs font-extrabold uppercase">Tap your rating</span>
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
              Saved {{ imageRatings[image.id] }}/10
            </p>
          </article>
        </div>
      </div>

      <button type="submit" class="pop-btn w-full">Submit feedback</button>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>
    </form>
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
