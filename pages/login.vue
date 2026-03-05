<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const supabase = useSupabaseClient()
const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function login() {
  errorMessage.value = ''
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  if (error || !data.session || !data.user) {
    errorMessage.value = error?.message ?? 'Login failed'
    return
  }

  auth.setAuth({
    accessToken: data.session.access_token,
    userId: data.user.id,
    email: data.user.email
  })

  await router.push('/dashboard')
}
</script>

<template>
  <section class="pop-in mx-auto max-w-md space-y-4">
    <h1 class="text-4xl">Login</h1>
    <form class="pop-panel space-y-3" @submit.prevent="login">
      <input v-model="email" type="email" required placeholder="Email" class="pop-input" />
      <input v-model="password" type="password" required placeholder="Password" class="pop-input" />
      <button class="pop-btn w-full" type="submit">Sign in</button>
      <p v-if="errorMessage" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ errorMessage }}</p>
    </form>
  </section>
</template>
