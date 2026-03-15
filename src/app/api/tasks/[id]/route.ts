import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, verifyApiKey } from '@/lib/auth'
import { getTask, updateTask, deleteTask, getOrCreateUser, createTask } from '@/lib/db'
import { createCalendarEvent } from '@/lib/google-calendar'
import { computeNextDueDate } from '@/lib/recurrence'

async function getAuthUser(request: NextRequest) {
  if (verifyApiKey(request)) {
    const email = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim()
    if (email) {
      return await getOrCreateUser(email)
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
  const task = await getTask(parseInt(id), user.id)

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

  const existing = await getTask(taskId, user.id) as any
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  try {
    const data = await request.json()
    await updateTask(taskId, user.id, data)

    // Handle recurrence
    if (data.completed === true && !existing.completed && existing.recurrence_rule) {
      const from = existing.due_date ? new Date(existing.due_date) : new Date()
      const nextDue = computeNextDueDate(existing.recurrence_rule, from)
      
      await createTask(user.id, {
        title: existing.title,
        notes: existing.notes,
        due_date: nextDue.toISOString().split('T')[0],
        recurrence_rule: existing.recurrence_rule,
        list_id: existing.list_id,
        parent_id: existing.parent_id,
      })
    }

    // Create calendar event if due_date was added/changed
    if (data.due_date && data.due_date !== existing.due_date) {
      createCalendarEvent(
        data.title || existing.title,
        data.due_date,
        data.notes || existing.notes
      ).catch(() => {})
    }

    const updated = await getTask(taskId, user.id)
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

  const existing = await getTask(taskId, user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  await deleteTask(taskId, user.id)

  return NextResponse.json({ success: true })
}
