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

async function loadProfileStatus() {
  try {
    const data = await $fetch<{ profile: any }>('/api/profile/me', {
      headers: useApiAuthHeaders()
    })
    hasProfile.value = Boolean(data.profile)
  } catch {
    hasProfile.value = false
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
        base64
      }
    })

    message.value = 'Image uploaded.'
    error.value = ''
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
      <p class="text-sm font-extrabold uppercase">Bucket: surpriseme_profiles, path: profiles/{userId}/{imageId}.jpg</p>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
      <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>
    </div>
  </section>
</template>
