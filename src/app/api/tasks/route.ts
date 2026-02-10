import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, verifyApiKey } from '@/lib/auth'
import { getTasks, createTask, getOrCreateUser } from '@/lib/db'
import { createCalendarEvent } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  // Check for API key first (for Clawdbot)
  if (verifyApiKey(request)) {
    const email = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim()
    if (email) {
      const user = getOrCreateUser(email)
      const listId = request.nextUrl.searchParams.get('list_id')
      const tasks = getTasks(user.id, listId ? parseInt(listId) : undefined)
      return NextResponse.json({ tasks })
    }
  }
  
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const listId = request.nextUrl.searchParams.get('list_id')
  const tasks = getTasks(user.id, listId ? parseInt(listId) : undefined)
  
  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  // Check for API key first (for Clawdbot)
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
    
    if (!data.title || typeof data.title !== 'string') {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }
    
    const task = createTask(user.id, {
      title: data.title,
      notes: data.notes,
      due_date: data.due_date,
      list_id: data.list_id,
      parent_id: data.parent_id,
    })

    // Create Google Calendar event if task has a due date
    if (data.due_date) {
      createCalendarEvent(data.title, data.due_date, data.notes).catch(() => {})
    }
    
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
