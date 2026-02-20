import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { getSession, createSession, deleteSession, getOrCreateUser, createMagicLink, getMagicLink, useMagicLink } from './db'
import { sendMagicLinkEmail } from './email'

const SESSION_COOKIE = '90tasks_session'
const SESSION_DURATION_DAYS = 30

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionId) return null

  const session = await getSession(sessionId)
  if (!session) return null

  return { id: session.user_id, email: session.email }
}

export async function sendMagicLink(email: string) {
  const linkId = uuidv4()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await createMagicLink(linkId, email, expiresAt)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLink = `${baseUrl}/api/auth/verify?token=${linkId}`

  await sendMagicLinkEmail(email, magicLink)

  return { success: true }
}

export async function verifyMagicLink(token: string) {
  const link = await getMagicLink(token)
  if (!link) return null

  await useMagicLink(token)

  const user = await getOrCreateUser(link.email)
  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)

  await createSession(sessionId, user.id, expiresAt)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return user
}

export async function logout() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (sessionId) {
    await deleteSession(sessionId)
    cookieStore.delete(SESSION_COOKIE)
  }
}

// API key auth for Clawdbot
export function verifyApiKey(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  return apiKey === process.env.API_KEY
}
