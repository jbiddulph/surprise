<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeaders } from '~/composables/useApi'

const route = useRoute()
const auth = useAuthStore()
const message = ref('')
const error = ref('')

const form = reactive({
  attractiveness_rating: 'Attractive',
  body_type_perception: 'Athletic',
  confidence_perception: 'Confident',
  approachability: 'Friendly',
  comment: ''
})

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
    message.value = 'Thanks for contributing positive feedback.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Submission failed'
  }
}
</script>

<template>
  <section class="pop-in mx-auto max-w-xl space-y-4">
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

      <button type="submit" class="pop-btn w-full">Submit feedback</button>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>
    </form>
  </section>
</template>
