import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, verifyApiKey } from '@/lib/auth'
import { getLists, createList, getOrCreateUser } from '@/lib/db'

export async function GET(request: NextRequest) {
  let user
  if (verifyApiKey(request)) {
    const email = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim()
    if (email) {
      user = getOrCreateUser(email)
    }
  } else {
    user = await getCurrentUser()
  }
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const lists = getLists(user.id)
  return NextResponse.json({ lists })
}

export async function POST(request: NextRequest) {
  let user
  if (verifyApiKey(request)) {
    const email = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim()
    if (email) {
      user = getOrCreateUser(email)
    }
  } else {
    user = await getCurrentUser()
  }
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const data = await request.json()
    
    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }
    
    const list = createList(user.id, data.name)
    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    console.error('Create list error:', error)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}
