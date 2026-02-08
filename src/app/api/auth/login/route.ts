import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    
    // Optional: Restrict to allowed emails
    const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase())
    if (allowedEmails && !allowedEmails.includes(email.toLowerCase())) {
      return NextResponse.json({ error: 'Email not authorized' }, { status: 403 })
    }
    
    await sendMagicLink(email.toLowerCase())
    
    return NextResponse.json({ success: true, message: 'Magic link sent!' })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
