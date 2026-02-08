import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, verifyApiKey } from '@/lib/auth'
import { getTask, updateTask, deleteTask, getOrCreateUser } from '@/lib/db'

async function getAuthUser(request: NextRequest) {
  if (verifyApiKey(request)) {
    const email = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim()
    if (email) {
      return getOrCreateUser(email)
    }
  }
  return await getCurrentUser()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id } = await params
  const task = getTask(parseInt(id), user.id)
  
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  return NextResponse.json({ task })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id } = await params
  const taskId = parseInt(id)
  
  const existing = getTask(taskId, user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  try {
    const data = await request.json()
    updateTask(taskId, user.id, data)
    
    const updated = getTask(taskId, user.id)
    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { id } = await params
  const taskId = parseInt(id)
  
  const existing = getTask(taskId, user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  deleteTask(taskId, user.id)
  
  return NextResponse.json({ success: true })
}
