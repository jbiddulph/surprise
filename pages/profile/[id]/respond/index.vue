<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeaders } from '~/composables/useApi'

const route = useRoute()
const auth = useAuthStore()
const message = ref('')
const error = ref('')
const profile = ref<any>(null)
const imageRatings = reactive<Record<string, number>>({})

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
    imageRatings[image.id] = 7
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
    await $fetch('/api/questionnaire/submit', {
      method: 'POST',
      headers: useApiAuthHeaders(),
      body: {
        profile_id: route.params.id,
        ...form
      }
    })

    const images = profile.value?.images || []
    if (images.length) {
      await Promise.all(
        images.map((image: any) =>
          $fetch('/api/image-rating/submit', {
            method: 'POST',
            headers: useApiAuthHeaders(),
            body: {
              profile_id: route.params.id,
              image_id: image.id,
              rating: Number(imageRatings[image.id] || 7)
            }
          })
        )
      )
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
        <h2 class="text-3xl">Rate Images (1-10)</h2>
        <div class="stagger-pop grid gap-3 sm:grid-cols-2">
          <article v-for="image in profile.images" :key="image.id" class="rounded-xl border-4 border-black bg-white p-3">
            <img :src="image.image_url" alt="Profile image" class="h-44 w-full rounded-lg border-2 border-black object-cover" />
            <label class="mt-2 block">
              <span class="mb-1 block text-xs font-extrabold uppercase">Your rating</span>
              <input v-model.number="imageRatings[image.id]" min="1" max="10" type="number" class="pop-input" />
            </label>
          </article>
        </div>
      </div>

      <button type="submit" class="pop-btn w-full">Submit feedback</button>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>
    </form>
  </section>
</template>
