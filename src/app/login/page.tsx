'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'invalid_token') {
      setError('Magic link expired or invalid. Please request a new one.')
    } else if (errorParam === 'missing_token') {
      setError('Invalid login link.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 mb-6">
            We sent a magic link to<br />
            <span className="font-medium text-slate-700">{email}</span>
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">90Tasks</h1>
        <p className="text-slate-500">Sign in to manage your tasks</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 
                     focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500
                     text-slate-900 placeholder-slate-400 mb-4"
          />

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium
                     hover:bg-slate-800 transition-colors shadow-md
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          We&apos;ll email you a magic link for password-free sign in.
        </p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
