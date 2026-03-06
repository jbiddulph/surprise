import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  return { is_admin: true, user_id: user.id }
})
