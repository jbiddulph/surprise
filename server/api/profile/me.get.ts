import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const account = await prisma.surpriseme_users.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      gender_identity: true,
      sexual_orientation: true,
      age_range: true,
      country: true
    }
  })

  const profile = await prisma.surpriseme_profiles.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'asc' }
  })

  if (!profile) {
    return { account, profile: null, prediction: null }
  }

  const prediction = await prisma.surpriseme_predictions.findFirst({
    where: { profile_id: profile.id },
    orderBy: { created_at: 'desc' }
  })

  return { account, profile, prediction }
})
