'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Task {
  id: number
  title: string
  notes?: string
  due_date?: string
  completed: boolean
  list_id?: number
  created_at: string
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newDueDate, setNewDueDate] = useState('')

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
        due_date: newDueDate || undefined 
      }),
    })

    if (res.ok) {
      setNewTask('')
      setNewDueDate('')
      await fetchTasks()
    }
  }

  const toggleTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
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
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  const incompleteTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

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
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-3 py-3 rounded-xl border border-slate-200 bg-white 
                       focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                       text-slate-600 w-36"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium
                       hover:bg-slate-800 transition-colors shadow-md"
            >
              Add
            </button>
          </div>
        </form>

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
              <div className="flex-1 min-w-0">
                <p className="task-title text-slate-900 font-medium">{task.title}</p>
                {task.notes && (
                  <p className="text-sm text-slate-500 mt-1 truncate">{task.notes}</p>
                )}
                {task.due_date && (
                  <p className={`text-xs mt-1 ${isOverdue(task) ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                    {formatDate(task.due_date)}
                  </p>
                )}
              </div>
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
