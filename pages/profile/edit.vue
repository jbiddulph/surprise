<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeadersSafe } from '~/composables/useApi'

const auth = useAuthStore()
const message = ref('')
const error = ref('')
const loading = ref(true)
const hasProfile = ref(false)

const form = reactive({
  display_name: '',
  gender_identity: '',
  sexual_orientation: '',
  age_range: '',
  country: '',
  bio: '',
  height_range: '',
  body_type: 'Average',
  fitness_level: 'Moderately active',
  hair_colour: '',
  eye_colour: '',
  ethnicity: '',
  is_public: true,
  predictions: {
    predicted_attractiveness: 'Average',
    predicted_confidence: 'Neutral',
    predicted_body_type: 'Average'
  }
})

async function loadMyProfile() {
  loading.value = true
  error.value = ''

  try {
    const headers = await useApiAuthHeadersSafe()
    const data = await $fetch<{
      account: any
      profile: any
      prediction: any
    }>('/api/profile/me', {
      headers
    })

    hasProfile.value = Boolean(data.profile)

    if (data.account) {
      form.display_name = data.account.display_name || ''
      form.gender_identity = data.account.gender_identity || ''
      form.sexual_orientation = data.account.sexual_orientation || ''
      form.age_range = data.account.age_range || ''
      form.country = data.account.country || ''
    }

    if (data.profile) {
      form.bio = data.profile.bio || ''
      form.height_range = data.profile.height_range || ''
      form.body_type = data.profile.body_type || 'Average'
      form.fitness_level = data.profile.fitness_level || 'Moderately active'
      form.hair_colour = data.profile.hair_colour || ''
      form.eye_colour = data.profile.eye_colour || ''
      form.ethnicity = data.profile.ethnicity || ''
      form.is_public = data.profile.is_public ?? true
    }

    if (data.prediction) {
      form.predictions.predicted_attractiveness = data.prediction.predicted_attractiveness || 'Average'
      form.predictions.predicted_confidence = data.prediction.predicted_confidence || 'Neutral'
      form.predictions.predicted_body_type = data.prediction.predicted_body_type || 'Average'
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function submit() {
  message.value = ''
  error.value = ''

  if (!auth.isAuthenticated) {
    error.value = 'Please log in first.'
    return
  }

  try {
    const headers = await useApiAuthHeadersSafe()
    const res = await $fetch<{ mode: 'created' | 'updated' }>('/api/profile/create', {
      method: 'POST',
      headers,
      body: form
    })
    hasProfile.value = true
    message.value = res.mode === 'updated' ? 'Profile updated successfully.' : 'Profile created successfully.'
    await loadMyProfile()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to save profile'
  }
}

onMounted(loadMyProfile)
</script>

<template>
  <section class="pop-in space-y-4">
    <h1 class="text-4xl">{{ hasProfile ? 'Edit Profile' : 'Create Profile' }}</h1>
    <div v-if="loading" class="pop-panel">Loading profile...</div>
    <form v-else class="pop-panel grid gap-3 md:grid-cols-2" @submit.prevent="submit">
      <input v-model="form.display_name" required placeholder="Display name" class="pop-input" />
      <input v-model="form.country" placeholder="Country / region" class="pop-input" />
      <input v-model="form.age_range" placeholder="Age range" class="pop-input" />
      <input v-model="form.gender_identity" placeholder="Gender identity" class="pop-input" />
      <input v-model="form.sexual_orientation" placeholder="Sexual orientation" class="pop-input" />
      <input v-model="form.height_range" placeholder="Height range" class="pop-input" />
      <input v-model="form.body_type" placeholder="Body type" class="pop-input" />
      <input v-model="form.fitness_level" placeholder="Fitness level" class="pop-input" />
      <input v-model="form.hair_colour" placeholder="Hair colour" class="pop-input" />
      <input v-model="form.eye_colour" placeholder="Eye colour" class="pop-input" />
      <input v-model="form.ethnicity" placeholder="Ethnicity (optional)" class="pop-input" />
      <textarea v-model="form.bio" placeholder="Bio" rows="3" class="pop-textarea md:col-span-2" />
      <label class="flex items-center gap-2 text-sm font-extrabold uppercase md:col-span-2">
        <input v-model="form.is_public" type="checkbox" /> Public profile
      </label>
      <button class="pop-btn md:col-span-2" type="submit">{{ hasProfile ? 'Update profile' : 'Save profile' }}</button>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold md:col-span-2">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold md:col-span-2">{{ error }}</p>
    </form>
  </section>
</template>
