import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/auth'

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'https://90tasks.ki-katapult.de'
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const baseUrl = getBaseUrl(request)

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', baseUrl))
  }

  const user = await verifyMagicLink(token)

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl))
  }

  return NextResponse.redirect(new URL('/', baseUrl))
}
