import { prisma } from '../../../utils/prisma'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const pending = await prisma.surpriseme_profile_images.findMany({
    where: { approval_status: 'pending' },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      image_url: true,
      storage_path: true,
      category: true,
      created_at: true,
      profile: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              display_name: true,
              email: true
            }
          }
        }
      }
    }
  })

  return pending
})
