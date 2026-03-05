<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const message = ref('')
const errorMessage = ref('')

async function register() {
  message.value = ''
  errorMessage.value = ''

  const { error } = await supabase.auth.signUp({ email: email.value, password: password.value })
  if (error) {
    errorMessage.value = error.message
    return
  }

  message.value = 'Account created. Check your email to verify your account, then sign in.'
  await router.push('/login')
}
</script>

<template>
  <section class="pop-in mx-auto max-w-md space-y-4">
    <h1 class="text-4xl">Register</h1>
    <form class="pop-panel space-y-3" @submit.prevent="register">
      <input v-model="email" type="email" required placeholder="Email" class="pop-input" />
      <input v-model="password" type="password" required placeholder="Password" class="pop-input" />
      <button class="pop-btn w-full" type="submit">Create account</button>
      <p v-if="errorMessage" class="rounded-lg border-2 border-black bg-[#ffb4b4] px-3 py-2 text-sm font-extrabold">{{ errorMessage }}</p>
      <p v-if="message" class="rounded-lg border-2 border-black bg-[#b8ffcb] px-3 py-2 text-sm font-extrabold">{{ message }}</p>
    </form>
  </section>
</template>
