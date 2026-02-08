import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }
  
  const user = await verifyMagicLink(token)
  
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
  }
  
  return NextResponse.redirect(new URL('/', request.url))
}
