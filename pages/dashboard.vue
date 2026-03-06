<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>

<template>
  <section class="pop-in space-y-6">
    <h1 class="text-4xl">Dashboard</h1>
    <div class="stagger-pop grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <NuxtLink to="/profile/edit" class="pop-panel text-center font-extrabold uppercase">Create / Edit Profile</NuxtLink>
      <NuxtLink to="/profile/images" class="pop-panel text-center font-extrabold uppercase">Manage Images</NuxtLink>
      <NuxtLink to="/profile/results" class="pop-panel text-center font-extrabold uppercase">View Results</NuxtLink>
      <NuxtLink to="/explore" class="pop-panel text-center font-extrabold uppercase">Contribute Feedback</NuxtLink>
      <NuxtLink to="/admin" class="pop-panel text-center font-extrabold uppercase">Admin</NuxtLink>
    </div>
  </section>
</template>
