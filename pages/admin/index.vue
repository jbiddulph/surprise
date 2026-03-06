<script setup lang="ts">
definePageMeta({
  middleware: ['admin']
})

import { useApiAuthHeadersSafe } from '~/composables/useApi'

type PendingImage = {
  id: string
  image_url: string
  category: string
  created_at: string
  profile: {
    id: string
    user: {
      id: string
      display_name: string
      email: string
    }
  }
}

const items = ref<PendingImage[]>([])
const loading = ref(false)
const error = ref('')

async function loadPending() {
  loading.value = true
  error.value = ''
  try {
    items.value = await $fetch('/api/admin/images/pending', {
      headers: await useApiAuthHeadersSafe()
    })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to load pending images'
  } finally {
    loading.value = false
  }
}

async function review(imageId: string, action: 'approve' | 'reject') {
  try {
    await $fetch('/api/admin/images/review', {
      method: 'POST',
      headers: await useApiAuthHeadersSafe(),
      body: { image_id: imageId, action }
    })
    await loadPending()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to review image'
  }
}

onMounted(loadPending)
</script>

<template>
  <section class="pop-in space-y-4">
    <h1 class="text-4xl">Admin Dashboard</h1>
    <p class="font-bold">Review pending user images for approval.</p>

    <div v-if="loading" class="pop-panel">Loading...</div>
    <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>

    <div v-if="!loading && !items.length" class="pop-panel">No pending images.</div>

    <div class="stagger-pop grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="item in items" :key="item.id" class="pop-panel">
        <img :src="item.image_url" alt="Pending image" class="h-52 w-full rounded-lg border-2 border-black object-cover" />
        <p class="mt-2 text-xs font-extrabold uppercase">Category: {{ item.category }}</p>
        <p class="text-xs font-bold">{{ item.profile.user.display_name }} ({{ item.profile.user.email }})</p>
        <div class="mt-3 flex gap-2">
          <button class="pop-btn" @click="review(item.id, 'approve')">Approve</button>
          <button class="pop-btn-alt" @click="review(item.id, 'reject')">Reject</button>
        </div>
      </article>
    </div>
  </section>
</template>
