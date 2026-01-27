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

        // Signup succeeded, now send verification OTP
        const otpResult = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'email-verification',
        })

        if (otpResult.error) {
          setError(otpResult.error.message || 'Failed to send verification code')
          return
        }

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

      // Email verified, now sign in automatically
      const signInResult = await authClient.signIn.email({
        email,
        password,
      })

      if (signInResult.error) {
        setError(signInResult.error.message || 'Verification succeeded but sign-in failed')
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

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      await authClient.signIn.social({ provider: 'google' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

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
      </div>
    </Modal>
  )
}
