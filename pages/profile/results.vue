<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import { useAuthStore } from '~/stores/auth'
import { useApiAuthHeadersSafe } from '~/composables/useApi'

const auth = useAuthStore()
const loading = ref(false)
const result = ref<any>(null)
const error = ref('')
const hasProfile = ref(true)

async function fetchResults() {
  if (!auth.isAuthenticated) return
  loading.value = true
  error.value = ''

  try {
    result.value = await $fetch('/api/results/get', {
      method: 'POST',
      headers: await useApiAuthHeadersSafe(),
      body: {}
    })
    hasProfile.value = true
  } catch (e: any) {
    const msg = e?.data?.statusMessage || 'Failed to load results'
    error.value = msg
    if (msg.includes('own result dashboard')) {
      hasProfile.value = false
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchResults)
</script>

<template>
  <section class="pop-in space-y-4">
    <h1 class="text-4xl">Results Dashboard</h1>
    <div class="flex flex-wrap gap-2">
      <button class="pop-btn" @click="fetchResults">Refresh</button>
    </div>

    <div v-if="loading" class="pop-panel">Loading...</div>
    <p v-if="!hasProfile" class="rounded-lg border-2 border-black bg-[#ffefb0] px-3 py-2 text-sm font-extrabold">
      Create your profile first to view results.
    </p>
    <p v-if="error" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ error }}</p>

    <div v-if="result" class="stagger-pop space-y-4">
      <div class="pop-panel">
        <h2 class="text-3xl">Confidence Boost Summary</h2>
        <p class="mt-2 font-bold">{{ result.confidence_boost_summary }}</p>
      </div>

      <div class="pop-panel">
        <h2 class="text-3xl">Expectation vs Reality</h2>
        <pre class="mt-2 overflow-auto rounded-lg border-2 border-black bg-[#fffce6] p-3 text-sm font-bold">{{ result.expectation_vs_reality }}</pre>
      </div>

      <div class="pop-panel">
        <h2 class="text-3xl">Poll Aggregates</h2>
        <pre class="mt-2 overflow-auto rounded-lg border-2 border-black bg-[#fffce6] p-3 text-sm font-bold">{{ result.aggregates }}</pre>
      </div>

      <div class="pop-panel">
        <h2 class="text-3xl">Image Ratings</h2>
        <div v-if="result.image_ratings?.length" class="mt-3 grid gap-3 sm:grid-cols-2">
          <article v-for="img in result.image_ratings" :key="img.image_id" class="rounded-xl border-4 border-black bg-white p-3">
            <img :src="img.image_url" alt="Rated image" class="h-44 w-full rounded-lg border-2 border-black object-cover" />
            <p class="mt-2 text-sm font-extrabold uppercase">
              Avg: {{ img.avg_rating ?? 'No ratings' }}
              <span v-if="img.rating_count">({{ img.rating_count }} votes)</span>
            </p>
          </article>
        </div>
        <p v-else class="mt-2 text-sm font-bold">No image ratings yet.</p>
      </div>
    </div>
  </section>
</template>
