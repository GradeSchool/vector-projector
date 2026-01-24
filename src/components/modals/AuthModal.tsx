import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { authClient } from '../../lib/auth-client'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
}

type Step = 'form' | 'verify'

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setEmail('')
      setPassword('')
      setName('')
      setCode('')
      setError('')
    }
  }, [isOpen, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })

        if (result.error) {
          setError(result.error.message || 'Something went wrong')
          return
        }

        // Signup succeeded, now need to verify email
        setStep('verify')
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })

        if (result.error) {
          setError(result.error.message || 'Something went wrong')
          return
        }

        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      })

      if (result.error) {
        setError(result.error.message || 'Invalid code')
        return
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })

      if (result.error) {
        setError(result.error.message || 'Failed to resend code')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Verification step
  if (step === 'verify') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Verify your email">
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-2xl tracking-widest"
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      </Modal>
    )
  }

  // Sign in / Sign up form
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </Modal>
  )
}
