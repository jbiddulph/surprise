const blockedWords = ['idiot', 'ugly', 'hate', 'stupid', 'worthless']
const negativePhrases = ['not good', 'bad looking', 'you look bad']

export function sanitizeComment(input: string) {
  const trimmed = input.trim().slice(0, 280)
  if (!trimmed) return ''

  const lowered = trimmed.toLowerCase()
  for (const token of blockedWords) {
    if (lowered.includes(token)) {
      throw createError({ statusCode: 400, statusMessage: 'Comment contains blocked language' })
    }
  }

  for (const phrase of negativePhrases) {
    if (lowered.includes(phrase)) {
      throw createError({ statusCode: 400, statusMessage: 'Comment sentiment appears negative' })
    }
  }

  return trimmed
}
