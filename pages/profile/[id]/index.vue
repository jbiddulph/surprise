<script setup lang="ts">
const route = useRoute()
const profile = ref<any>(null)

onMounted(async () => {
  profile.value = await $fetch(`/api/public/profile/${route.params.id}`)
})
</script>

<template>
  <section class="pop-in space-y-4" v-if="profile">
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
          <img :src="image.image_url" alt="Profile image" class="h-52 w-full rounded-lg border-2 border-black object-cover" />
          <p class="mt-2 text-sm font-extrabold uppercase">
            Community score: {{ image.avg_rating ?? 'No ratings yet' }}
            <span v-if="image.rating_count">({{ image.rating_count }} votes)</span>
          </p>
        </article>
      </div>

      <NuxtLink :to="`/profile/${profile.id}/respond`" class="pop-btn mt-4">Respond</NuxtLink>
    </div>
  </section>
</template>
