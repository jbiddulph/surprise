<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeaders } from '~/composables/useApi'

const auth = useAuthStore()
const message = ref('')
const error = ref('')
const hasProfile = ref(true)
const selectedCategory = ref('Body (torso)')
const categories = ['Boobs', 'Bum', 'Legs', 'Hands', 'Feet', 'Face', 'Hair', 'Body (torso)']
const images = ref<Array<{ id: string; image_url: string; category: string; approval_status: string }>>([])

async function loadProfileStatus() {
  try {
    const data = await $fetch<{ profile: any; images?: Array<{ id: string; image_url: string; category: string; approval_status: string }> }>('/api/profile/me', {
      headers: useApiAuthHeaders()
    })
    hasProfile.value = Boolean(data.profile)
    images.value = data.images || []
  } catch {
    hasProfile.value = false
    images.value = []
  }
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!auth.isAuthenticated) {
    error.value = 'Please log in first.'
    return
  }

  if (!hasProfile.value) {
    error.value = 'Create your profile before uploading images.'
    return
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const base64 = dataUrl.split(',')[1]

  try {
    await $fetch('/api/profile/images/upload', {
      method: 'POST',
      headers: useApiAuthHeaders(),
      body: {
        filename: file.name,
        content_type: file.type || 'image/jpeg',
        base64,
        category: selectedCategory.value
      }
    })

    message.value = 'Image uploaded.'
    error.value = ''
    await loadProfileStatus()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Upload failed'
  }
}

onMounted(loadProfileStatus)
</script>

<template>
  <section class="pop-in max-w-xl space-y-4">
    <h1 class="text-4xl">Profile Images</h1>
    <div class="pop-panel space-y-3">
      <p v-if="!hasProfile" class="rounded-lg border-2 border-black bg-[#ffefb0] px-3 py-2 text-sm font-extrabold">
        Create your profile first, then upload images.
      </p>
      <input type="file" accept="image/*" class="pop-input" :disabled="!hasProfile" @change="uploadFile" />
      <label class="block">
        <span class="mb-1 block text-xs font-extrabold uppercase">Image category</span>
        <select v-model="selectedCategory" class="pop-select">
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
      </label>
      <p class="text-sm font-extrabold uppercase">Bucket: surpriseme_profiles, path: profiles/{userId}/{imageId}.jpg</p>
      <div v-if="images.length" class="stagger-pop grid gap-3 sm:grid-cols-2">
        <article v-for="image in images" :key="image.id" class="rounded-xl border-4 border-black bg-white p-2">
          <img :src="image.image_url" alt="Uploaded profile image" class="h-40 w-full rounded-lg border-2 border-black object-cover" />
          <p class="mt-2 text-xs font-extrabold uppercase">Category: {{ image.category }}</p>
          <p class="text-xs font-bold uppercase">Status: {{ image.approval_status }}</p>
        </article>
      </div>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>
    </div>
  </section>
</template>
