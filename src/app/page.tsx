'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Task {
  id: number
  title: string
  notes?: string
  due_date?: string
  completed: boolean
  starred?: boolean
  list_id?: number
  created_at: string
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [expandedTask, setExpandedTask] = useState<number | null>(null)
  const [editingNotes, setEditingNotes] = useState<{ id: number; notes: string } | null>(null)
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'no-date' | 'starred'>('all')
  const [sortBy, setSortBy] = useState<'due-asc' | 'due-desc' | 'created-desc' | 'created-asc' | 'title'>('due-asc')

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          await fetchTasks()
        } else {
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    init()
  }, [router, fetchTasks])

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: newTask.trim(),
        notes: newNotes.trim() || undefined,
        due_date: newDueDate || undefined 
      }),
    })

    if (res.ok) {
      setNewTask('')
      setNewNotes('')
      setNewDueDate('')
      await fetchTasks()
    }
  }

  const updateNotes = async (taskId: number, notes: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setEditingNotes(null)
    await fetchTasks()
  }

  const toggleTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    await fetchTasks()
  }

  const toggleStar = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !task.starred }),
    })
    await fetchTasks()
  }

  const deleteTask = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    await fetchTasks()
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.completed) return false
    return new Date(task.due_date) < new Date(new Date().toDateString())
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const hasTime = dateStr.includes('T')

    if (date.toDateString() === today.toDateString()) {
      return hasTime
        ? `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return hasTime
        ? `Tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : 'Tomorrow'
    }

    return hasTime
      ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isToday = (task: Task) => {
    if (!task.due_date) return false
    const due = new Date(task.due_date)
    const today = new Date()
    return due.toDateString() === today.toDateString()
  }

  const isUpcoming = (task: Task) => {
    if (!task.due_date || task.completed) return false
    const due = new Date(task.due_date)
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return due >= tomorrow
  }

  const applyDueFilter = (task: Task) => {
    switch (dueFilter) {
      case 'overdue':
        return isOverdue(task)
      case 'today':
        return isToday(task)
      case 'upcoming':
        return isUpcoming(task)
      case 'no-date':
        return !task.due_date
      case 'starred':
        return !!task.starred
      default:
        return true
    }
  }

  const compareTasks = (a: Task, b: Task) => {
    switch (sortBy) {
      case 'due-desc': {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : -Infinity
        const bTime = b.due_date ? new Date(b.due_date).getTime() : -Infinity
        return bTime - aTime
      }
      case 'created-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'created-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'due-asc':
      default: {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return aTime - bTime
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  const incompleteTasks = tasks
    .filter(t => !t.completed)
    .filter(applyDueFilter)
    .sort(compareTasks)

  const completedTasks = tasks
    .filter(t => t.completed)
    .sort(compareTasks)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-10 border-b border-slate-200/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">90Tasks</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add Task Form */}
        <form onSubmit={addTask} className="mb-8">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white 
                         focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                         text-slate-900 placeholder-slate-400"
                autoFocus
              />
              <input
                type="datetime-local"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="px-3 py-3 rounded-xl border border-slate-200 bg-white 
                         focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                         text-slate-600 w-56"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium
                         hover:bg-slate-800 transition-colors shadow-md"
              >
                Add
              </button>
            </div>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white 
                       focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                       text-slate-700 placeholder-slate-400 text-sm"
            />
          </div>
        </form>

        {/* Filter Pills */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'All'],
              ['starred', '★ Starred'],
              ['overdue', 'Overdue'],
              ['today', 'Today'],
              ['upcoming', 'Upcoming'],
              ['no-date', 'No date'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDueFilter(value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                  dueFilter === value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'due-asc' | 'due-desc' | 'created-desc' | 'created-asc' | 'title')}
              className="px-3 py-1.5 text-sm rounded-full border border-slate-200 bg-white text-slate-700
                       hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                       cursor-pointer"
            >
              <option value="due-asc">Due date ↑</option>
              <option value="due-desc">Due date ↓</option>
              <option value="created-desc">Newest first</option>
              <option value="created-asc">Oldest first</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {incompleteTasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${isOverdue(task) ? 'overdue' : ''}`}
            >
              <button
                onClick={() => toggleTask(task)}
                className="task-checkbox mt-0.5"
              />
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <p className="task-title text-slate-900 font-medium">{task.title}</p>
                {task.notes && expandedTask !== task.id && (
                  <p className="text-sm text-slate-500 mt-1 truncate">{task.notes}</p>
                )}
                {task.due_date && (
                  <p className={`text-xs mt-1 ${isOverdue(task) ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                    {formatDate(task.due_date)}
                  </p>
                )}
                {expandedTask === task.id && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    {editingNotes?.id === task.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingNotes.notes}
                          onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                          placeholder="Add notes..."
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white 
                                   focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateNotes(task.id, editingNotes.notes)
                            if (e.key === 'Escape') setEditingNotes(null)
                          }}
                        />
                        <button
                          onClick={() => updateNotes(task.id, editingNotes.notes)}
                          className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm text-slate-500 p-2 bg-slate-50 rounded-lg cursor-text hover:bg-slate-100"
                        onClick={() => setEditingNotes({ id: task.id, notes: task.notes || '' })}
                      >
                        {task.notes || 'Click to add notes...'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleStar(task)}
                className={`transition-colors p-1 ${task.starred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'}`}
                title={task.starred ? 'Unstar' : 'Star'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={task.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m12 17.27 5.18 3.73-1.64-6.03L20 10.24l-6.19-.5L12 4 10.19 9.74 4 10.24l4.46 4.73L6.82 21z" />
                </svg>
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {tasks.length > 0 && incompleteTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No tasks match this filter.</p>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-slate-400 mb-3">
              Completed ({completedTasks.length})
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="task-item completed opacity-60">
                  <button
                    onClick={() => toggleTask(task)}
                    className="task-checkbox checked mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="task-title text-slate-500">{task.title}</p>
                  </div>
                  <button
                    onClick={() => toggleStar(task)}
                    className={`transition-colors p-1 ${task.starred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'}`}
                    title={task.starred ? 'Unstar' : 'Star'}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={task.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m12 17.27 5.18 3.73-1.64-6.03L20 10.24l-6.19-.5L12 4 10.19 9.74 4 10.24l4.46 4.73L6.82 21z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400">No tasks yet. Add one above!</p>
          </div>
        )}
      </main>
    </div>
  )
}
